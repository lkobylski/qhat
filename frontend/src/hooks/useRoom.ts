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
  const isReconnect = savedSession !== null;

  const [phase, setPhase] = useState<RoomPhase>('lobby');
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [myName, setMyName] = useState(savedSession?.name || '');
  const [myLang, setMyLang] = useState(savedSession?.lang || sessionStorage.getItem('userLang') || 'EN');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [joinPending, setJoinPending] = useState<JoinInfo | null>(
    savedSession ? { name: savedSession.name, lang: savedSession.lang } : null
  );
  const [reconnecting, setReconnecting] = useState(isReconnect);
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
      setReconnecting(false);
    },
    [roomId, send]
  );

  const leaveRoom = useCallback(() => {
    clearSession();
    sessionStorage.removeItem('fromLobby');
    sessionStorage.removeItem('fromLobbyName');
    sessionStorage.removeItem('fromLobbyLang');
    setPhase('ended');
    wsClient.disconnect();
  }, []);

  // Listen for room events
  useEffect(() => {
    const unsubPeerJoined = wsClient.on('peer_joined', (msg: OutboundMessage) => {
      setPeer({ name: msg.name || 'Unknown', lang: msg.lang || '' });
      setPhase('connecting');

      if (msg.role === 'offerer') {
        startOffer();
      }
    });

    const unsubPeerLeft = wsClient.on('peer_left', () => {
      setPeer(null);
      // Lobby calls: end immediately so both return to lobby
      // Private rooms: stay in waiting for potential reconnect
      const isFromLobby = sessionStorage.getItem('fromLobby') === '1';
      if (isFromLobby) {
        sessionStorage.removeItem('fromLobby');
        sessionStorage.removeItem('fromLobbyName');
        sessionStorage.removeItem('fromLobbyLang');
        clearSession();
        setPhase('ended');
      } else {
        setPhase('waiting');
      }
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
    reconnecting,
  };
}
