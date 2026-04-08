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

  const createPC = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({ type: 'ice', candidate: event.candidate.toJSON() });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0] || null);
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
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
    const pc = createPC();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send({ type: 'offer', sdp: offer.sdp });
  }, [createPC, send]);

  const handleOffer = useCallback(
    async (sdp: string) => {
      const pc = createPC();
      await pc.setRemoteDescription({ type: 'offer', sdp });

      // Drain queued ICE candidates
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

    // Drain queued ICE candidates
    for (const candidate of pendingCandidates.current) {
      await pc.addIceCandidate(candidate);
    }
    pendingCandidates.current = [];
  }, []);

  const handleICECandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) {
      // Queue if remote description not set yet
      pendingCandidates.current.push(candidate);
      return;
    }
    await pc.addIceCandidate(candidate);
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

  // Cleanup on unmount
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
