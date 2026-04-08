import { useRef, useState, useCallback, useEffect } from 'react';
import { wsClient } from '../lib/wsClient';
import type { InboundMessage, OutboundMessage } from '../types/ws';

interface UseWebRTCParams {
  send: (msg: InboundMessage) => void;
  localStream: MediaStream | null;
}

export function useWebRTC({ send, localStream }: UseWebRTCParams) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const iceRestartCount = useRef(0);

  const createPC = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
    }
    pendingCandidates.current = [];

    console.log('[WebRTC] Creating PeerConnection with ICE servers:', JSON.stringify(iceServersRef.current));
    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,
      iceCandidatePoolSize: 2,
    });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] ICE candidate:', event.candidate.type, event.candidate.protocol, event.candidate.address);
        send({ type: 'ice', candidate: event.candidate.toJSON() });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0] || null);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[WebRTC] Connection state:', state);
      setConnectionState(state);

      // Auto ICE restart on failure (max 3 attempts)
      if (state === 'failed' && iceRestartCount.current < 3) {
        iceRestartCount.current++;
        console.log(`ICE restart attempt ${iceRestartCount.current}`);
        pc.restartIce();
        pc.createOffer({ iceRestart: true }).then((offer) => {
          pc.setLocalDescription(offer);
          send({ type: 'offer', sdp: offer.sdp });
        });
      }

      // Reset restart count on success
      if (state === 'connected') {
        iceRestartCount.current = 0;
      }
    };

    // Auto ICE restart on disconnected after 5s
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected' && iceRestartCount.current < 3) {
            iceRestartCount.current++;
            console.log(`ICE reconnect attempt ${iceRestartCount.current}`);
            pc.restartIce();
            pc.createOffer({ iceRestart: true }).then((offer) => {
              pc.setLocalDescription(offer);
              send({ type: 'offer', sdp: offer.sdp });
            });
          }
        }, 3000);
      }
    };

    // Add local tracks if available
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    return pc;
  }, [send, localStream]);

  const startOffer = useCallback(async () => {
    iceRestartCount.current = 0;
    const pc = createPC();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send({ type: 'offer', sdp: offer.sdp });
  }, [createPC, send]);

  const handleOffer = useCallback(
    async (sdp: string) => {
      iceRestartCount.current = 0;
      // If we already have a PC with remote description, this might be an ICE restart
      const existingPC = pcRef.current;
      if (existingPC && existingPC.signalingState !== 'closed') {
        try {
          await existingPC.setRemoteDescription({ type: 'offer', sdp });
          // Drain queued candidates
          for (const candidate of pendingCandidates.current) {
            await existingPC.addIceCandidate(candidate);
          }
          pendingCandidates.current = [];
          const answer = await existingPC.createAnswer();
          await existingPC.setLocalDescription(answer);
          send({ type: 'answer', sdp: answer.sdp });
          return;
        } catch {
          // Fall through to create new PC
        }
      }

      const pc = createPC();
      await pc.setRemoteDescription({ type: 'offer', sdp });

      for (const candidate of pendingCandidates.current) {
        await pc.addIceCandidate(candidate);
      }
      pendingCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({ type: 'answer', sdp: answer.sdp });
    },
    [createPC, send]
  );

  const handleAnswer = useCallback(async (sdp: string) => {
    const pc = pcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription({ type: 'answer', sdp });

    for (const candidate of pendingCandidates.current) {
      await pc.addIceCandidate(candidate);
    }
    pendingCandidates.current = [];
  }, []);

  const handleICECandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) {
      pendingCandidates.current.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(candidate);
    } catch (e) {
      console.warn('Failed to add ICE candidate:', e);
    }
  }, []);

  // Subscribe to signaling messages
  useEffect(() => {
    const unsubICEServers = wsClient.on('ice_servers', (msg: OutboundMessage) => {
      if (msg.iceServers) {
        iceServersRef.current = msg.iceServers;
      }
    });

    const unsubOffer = wsClient.on('offer', (msg: OutboundMessage) => {
      if (msg.sdp) handleOffer(msg.sdp);
    });

    const unsubAnswer = wsClient.on('answer', (msg: OutboundMessage) => {
      if (msg.sdp) handleAnswer(msg.sdp);
    });

    const unsubICE = wsClient.on('ice', (msg: OutboundMessage) => {
      if (msg.candidate) handleICECandidate(msg.candidate);
    });

    return () => {
      unsubICEServers();
      unsubOffer();
      unsubAnswer();
      unsubICE();
    };
  }, [handleOffer, handleAnswer, handleICECandidate]);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
    };
  }, []);

  return {
    remoteStream,
    connectionState,
    startOffer,
  };
}
