import { useState, useCallback, useEffect, useRef } from 'react';
import { wsClient } from '../lib/wsClient';
import { WS_URL } from '../lib/constants';
import type { LobbyUser, OutboundMessage } from '../types/ws';

export function useLobby() {
  const [users, setUsers] = useState<LobbyUser[]>([]);
  const [isInLobby, setIsInLobby] = useState(false);
  const [loading, setLoading] = useState(false);
  const joinSent = useRef(false);

  const joinLobby = useCallback((name: string, lang: string) => {
    wsClient.connect(WS_URL);

    const onConnect = (connected: boolean) => {
      if (connected && !joinSent.current) {
        joinSent.current = true;
        wsClient.send({ type: 'lobby_join', name, lang });
        setIsInLobby(true);
        setLoading(true);
      }
    };

    // If already connected, send immediately
    if (wsClient.connected) {
      onConnect(true);
    }

    const unsub = wsClient.onConnectionChange(onConnect);
    // Store for cleanup
    return unsub;
  }, []);

  const leaveLobby = useCallback(() => {
    wsClient.send({ type: 'lobby_leave' });
    wsClient.disconnect();
    setIsInLobby(false);
    setLoading(false);
    setUsers([]);
    joinSent.current = false;
  }, []);

  useEffect(() => {
    const unsubUsers = wsClient.on('lobby_users', (msg: OutboundMessage) => {
      if (msg.users) {
        setUsers(msg.users);
        setLoading(false);
      }
    });

    const unsubJoin = wsClient.on('lobby_user_join', (msg: OutboundMessage) => {
      if (msg.user) {
        const newUser = msg.user;
        setUsers((prev) => {
          if (prev.some((u) => u.id === newUser.id)) return prev;
          return [...prev, newUser];
        });
      }
    });

    const unsubLeft = wsClient.on('lobby_user_left', (msg: OutboundMessage) => {
      if (msg.user) {
        const leftId = msg.user.id;
        setUsers((prev) => prev.filter((u) => u.id !== leftId));
      }
    });

    const unsubUpdate = wsClient.on('lobby_update', (msg: OutboundMessage) => {
      if (msg.user) {
        const updated = msg.user;
        setUsers((prev) =>
          prev.map((u) => (u.id === updated.id ? { ...u, status: updated.status } : u))
        );
      }
    });

    return () => {
      unsubUsers();
      unsubJoin();
      unsubLeft();
      unsubUpdate();
    };
  }, []);

  return { users, isInLobby, loading, joinLobby, leaveLobby };
}
