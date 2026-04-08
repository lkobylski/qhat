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
  const [candidateType, setCandidateType] = useState<string>('');
  const [quality, setQuality] = useState<'good' | 'ok' | 'poor' | ''>('');
  const [rtt, setRtt] = useState(0);
  const statsInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const createPC = useCallback(() => {
    if (statsInterval.current) {
      clearInterval(statsInterval.current);
      statsInterval.current = null;
    }
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

      // On connected: reset restart count, start polling stats
      if (state === 'connected') {
        iceRestartCount.current = 0;
        // Poll stats for candidate type, RTT, and quality
        statsInterval.current = setInterval(async () => {
          try {
            const stats = await pc.getStats();
            stats.forEach((report) => {
              if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                const local = stats.get(report.localCandidateId);
                if (local) {
                  setCandidateType(`${local.candidateType}/${local.protocol}`);
                }
                const currentRtt = Math.round((report.currentRoundTripTime || 0) * 1000);
                setRtt(currentRtt);
                const loss = report.packetsLost || 0;
                const sent = report.packetsSent || 1;
                const lossRate = loss / sent;
                if (currentRtt < 150 && lossRate < 0.02) setQuality('good');
                else if (currentRtt < 400 && lossRate < 0.05) setQuality('ok');
                else setQuality('poor');
              }
            });
          } catch { /* pc closed */ }
        }, 3000);
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

    // Prefer VP9 codec for better quality at lower bitrates
    preferCodec(pc, 'video', 'video/VP9');

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

  // Replace sender track when localStream changes (quality switch)
  useEffect(() => {
    const pc = pcRef.current;
    if (!pc || !localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
    if (sender && sender.track !== videoTrack) {
      sender.replaceTrack(videoTrack);
    }
  }, [localStream]);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      if (statsInterval.current) clearInterval(statsInterval.current);
    };
  }, []);

  return {
    remoteStream,
    connectionState,
    candidateType,
    quality,
    rtt,
    startOffer,
  };
}

// Prefer a specific codec by reordering transceiver codecs
function preferCodec(pc: RTCPeerConnection, kind: string, mimeType: string) {
  const transceivers = pc.getTransceivers();
  for (const transceiver of transceivers) {
    if (transceiver.sender.track?.kind !== kind) continue;
    // setCodecPreferences is not available in all browsers
    if (!transceiver.setCodecPreferences) continue;

    const codecs = RTCRtpReceiver.getCapabilities(kind)?.codecs || [];
    const preferred = codecs.filter((c) => c.mimeType === mimeType);
    const rest = codecs.filter((c) => c.mimeType !== mimeType);
    if (preferred.length > 0) {
      transceiver.setCodecPreferences([...preferred, ...rest]);
    }
  }
}
