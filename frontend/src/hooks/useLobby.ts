import { useState, useCallback, useEffect, useRef } from 'react';
import { wsClient } from '../lib/wsClient';
import { WS_URL } from '../lib/constants';
import { playMessageSound } from '../lib/sounds';
import { incrementUnread } from '../lib/titleBadge';
import type { LobbyUser, OutboundMessage } from '../types/ws';

export function useLobby() {
  const [users, setUsers] = useState<LobbyUser[]>([]);
  const [isInLobby, setIsInLobby] = useState(false);
  const [usersReceived, setUsersReceived] = useState(false);
  const joinSent = useRef(false);

  const joinLobby = useCallback((name: string, lang: string) => {
    wsClient.connect(WS_URL);

    const doJoin = () => {
      joinSent.current = true;
      wsClient.send({ type: 'lobby_join', name, lang });
      setIsInLobby(true);
    };

    // Allow re-join for profile updates
    if (wsClient.connected) {
      doJoin();
      return () => {};
    }

    const unsub = wsClient.onConnectionChange((connected: boolean) => {
      if (connected && !joinSent.current) {
        doJoin();
      }
    });
    return unsub;
  }, []);

  const leaveLobby = useCallback(() => {
    wsClient.send({ type: 'lobby_leave' });
    wsClient.disconnect();
    setIsInLobby(false);
    setUsersReceived(false);
    setUsers([]);
    joinSent.current = false;
  }, []);

  useEffect(() => {
    const unsubUsers = wsClient.on('lobby_users', (msg: OutboundMessage) => {
      setUsers(msg.users || []);
      setUsersReceived(true);
    });

    const unsubJoin = wsClient.on('lobby_user_join', (msg: OutboundMessage) => {
      if (msg.user) {
        const newUser = msg.user;
        setUsers((prev) => {
          // Upsert: replace if exists (same id, status might have changed), add if new
          const exists = prev.some((u) => u.id === newUser.id);
          if (exists) {
            return prev.map((u) => (u.id === newUser.id ? newUser : u));
          }
          return [...prev, newUser];
        });
        // Notify when tab is not focused
        if (document.hidden) {
          playMessageSound();
          incrementUnread();
        }
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

  const loading = isInLobby && !usersReceived;

  return { users, isInLobby, loading, joinLobby, leaveLobby };
}
