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

const SESSION_KEY = 'qhat_session';

interface SavedSession {
  roomId: string;
  name: string;
  lang: string;
}

function saveSession(s: SavedSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function loadSession(roomId: string): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: SavedSession = JSON.parse(raw);
    if (s.roomId === roomId) return s;
    return null;
  } catch {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

interface UseRoomParams {
  roomId: string;
  send: (msg: InboundMessage) => void;
  startOffer: () => Promise<void>;
  connectionState: RTCPeerConnectionState;
}

export function useRoom({ roomId, send, startOffer, connectionState }: UseRoomParams) {
  const savedSession = loadSession(roomId);

  // If we have a saved session for this room, skip lobby and go straight to rejoin
  const [phase, setPhase] = useState<RoomPhase>(savedSession ? 'lobby' : 'lobby');
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [myName, setMyName] = useState(savedSession?.name || '');
  const [myLang, setMyLang] = useState(savedSession?.lang || sessionStorage.getItem('userLang') || 'EN');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [joinPending, setJoinPending] = useState<JoinInfo | null>(
    savedSession ? { name: savedSession.name, lang: savedSession.lang } : null
  );
  const wasWaitingRef = useRef(false);
  const joinSent = useRef(false);

  const joinRoom = useCallback(
    (name: string, lang: string) => {
      if (joinSent.current) return;
      joinSent.current = true;
      setMyName(name);
      setMyLang(lang);
      sessionStorage.setItem('userLang', lang);
      saveSession({ roomId, name, lang });
      send({ type: 'join', roomId, name, lang });
      setPhase('waiting');
      setJoinPending(null);
    },
    [roomId, send]
  );

  const leaveRoom = useCallback(() => {
    clearSession();
    setPhase('ended');
    wsClient.disconnect();
  }, []);

  // Listen for room events
  useEffect(() => {
    const unsubPeerJoined = wsClient.on('peer_joined', (msg: OutboundMessage) => {
      setPeer({ name: msg.name || 'Unknown', lang: msg.lang || '' });
      setPhase('connecting');

      // Only the side that was already waiting creates the offer.
      // The newly joined/reconnected side waits for the offer.
      // This prevents glare (both sides sending offers simultaneously).
      if (wasWaitingRef.current) {
        startOffer();
      }
    });

    const unsubPeerLeft = wsClient.on('peer_left', () => {
      // Don't go to ended — peer may reconnect. Stay in waiting.
      setPeer(null);
      setPhase('waiting');
      wasWaitingRef.current = true; // we'll be the offerer when peer reconnects
    });

    const unsubRoomFull = wsClient.on('room_full', () => {
      clearSession();
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

  // Track if we're in waiting state (= we'll be the offerer when peer joins)
  useEffect(() => {
    if (phase === 'waiting') {
      wasWaitingRef.current = true;
    } else if (phase === 'connecting' || phase === 'connected') {
      wasWaitingRef.current = false;
    }
  }, [phase]);

  // Transition connecting → connected based on WebRTC state
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
