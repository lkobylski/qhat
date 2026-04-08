import { useState, useCallback, useEffect, useRef } from 'react';
import { wsClient } from '../lib/wsClient';
import type { InboundMessage, OutboundMessage } from '../types/ws';

export type RoomPhase = 'lobby' | 'waiting' | 'connecting' | 'connected' | 'ended' | 'error';

interface PeerInfo {
  name: string;
  lang: string;
}

interface JoinInfo {
  name: string;
  lang: string;
}

interface UseRoomParams {
  roomId: string;
  send: (msg: InboundMessage) => void;
  startOffer: () => Promise<void>;
  connectionState: RTCPeerConnectionState;
}

export function useRoom({ roomId, send, startOffer, connectionState }: UseRoomParams) {
  const [phase, setPhase] = useState<RoomPhase>('lobby');
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [myName, setMyName] = useState('');
  const [myLang, setMyLang] = useState(() => sessionStorage.getItem('userLang') || 'EN');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [joinPending, setJoinPending] = useState<JoinInfo | null>(null);
  const isCreator = useRef(false);
  const joinSent = useRef(false);

  const joinRoom = useCallback(
    (name: string, lang: string) => {
      if (joinSent.current) return;
      joinSent.current = true;
      setMyName(name);
      setMyLang(lang);
      sessionStorage.setItem('userLang', lang);
      send({ type: 'join', roomId, name, lang });
      setPhase('waiting');
      setJoinPending(null);
    },
    [roomId, send]
  );

  const leaveRoom = useCallback(() => {
    setPhase('ended');
    wsClient.disconnect();
  }, []);

  // Listen for room events
  useEffect(() => {
    const unsubPeerJoined = wsClient.on('peer_joined', (msg: OutboundMessage) => {
      setPeer({ name: msg.name || 'Unknown', lang: msg.lang || '' });
      setPhase('connecting');

      // If we were waiting (we're the creator), initiate the offer
      if (isCreator.current) {
        startOffer();
      }
    });

    const unsubPeerLeft = wsClient.on('peer_left', () => {
      setPhase('ended');
    });

    const unsubRoomFull = wsClient.on('room_full', () => {
      setErrorMessage('This room is full.');
      setPhase('error');
    });

    const unsubError = wsClient.on('error', (msg: OutboundMessage) => {
      setErrorMessage(msg.error || 'An error occurred');
    });

    return () => {
      unsubPeerJoined();
      unsubPeerLeft();
      unsubRoomFull();
      unsubError();
    };
  }, [startOffer]);

  // Track if we're the creator (first to join, enter waiting state)
  useEffect(() => {
    if (phase === 'waiting' && !peer) {
      isCreator.current = true;
    }
  }, [phase, peer]);

  // Transition connecting → connected based on WebRTC state
  // Also allow 'connected' phase even if WebRTC doesn't fully connect (text-only mode)
  useEffect(() => {
    if (phase === 'connecting' && connectionState === 'connected') {
      setPhase('connected');
    }
  }, [phase, connectionState]);

  // Auto-transition to connected after 5s in connecting (text-only fallback)
  useEffect(() => {
    if (phase !== 'connecting') return;
    const timer = setTimeout(() => {
      setPhase('connected');
    }, 5000);
    return () => clearTimeout(timer);
  }, [phase]);

  return {
    phase,
    peer,
    myName,
    myLang,
    joinRoom,
    leaveRoom,
    errorMessage,
    joinPending,
    setJoinPending,
  };
}
