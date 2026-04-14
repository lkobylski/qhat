import { useState, useCallback, useEffect, useRef } from 'react';
import { wsClient } from '../lib/wsClient';
import { WS_URL } from '../lib/constants';
import { playMessageSound } from '../lib/sounds';
import { incrementUnread } from '../lib/titleBadge';
import type { LobbyUser, OutboundMessage } from '../types/ws';

export interface DmMessage {
  id: number;
  from: string;
  senderId: string;
  original: string;
  translated: string;
  isMine: boolean;
  translationFailed?: boolean;
  ts: number;
}

let dmMsgId = 0;

export function useLobby() {
  const [users, setUsers] = useState<LobbyUser[]>([]);
  const [isInLobby, setIsInLobby] = useState(false);
  const [usersReceived, setUsersReceived] = useState(false);
  const [myId, setMyId] = useState('');
  const myIdRef = useRef('');
  const [unreadDMs, setUnreadDMs] = useState<Record<string, number>>({}); // userId → count
  const [dmMessages, setDmMessages] = useState<Record<string, DmMessage[]>>({}); // peerId → messages
  const openChatRef = useRef<string | null>(null); // currently open chat userId
  const joinSent = useRef(false);
  const lobbyNameRef = useRef('');
  const lobbyLangRef = useRef('');

  const joinLobby = useCallback((name: string, lang: string) => {
    lobbyNameRef.current = name;
    lobbyLangRef.current = lang;
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

  // Auto re-join lobby after WS reconnect (e.g., after sleep/wake)
  // Don't reset usersReceived — keep showing current list, it'll be replaced when lobby_users arrives
  useEffect(() => {
    const unsub = wsClient.onConnectionChange((connected) => {
      if (connected && isInLobby && lobbyNameRef.current) {
        console.log('[lobby] Reconnected, re-joining lobby...');
        wsClient.send({ type: 'lobby_join', name: lobbyNameRef.current, lang: lobbyLangRef.current });
      }
    });
    return unsub;
  }, [isInLobby]);

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
      if (msg.callerId) {
        setMyId(msg.callerId);
        myIdRef.current = msg.callerId;
      }
    });

    const unsubJoin = wsClient.on('lobby_user_join', (msg: OutboundMessage) => {
      if (msg.user) {
        const newUser = msg.user;
        setUsers((prev) => {
          const exists = prev.some((u) => u.id === newUser.id);
          if (exists) {
            // Same ID = reconnect, just update silently
            return prev.map((u) => (u.id === newUser.id ? newUser : u));
          }
          // New user — notify
          if (document.hidden) {
            playMessageSound();
            incrementUnread();
          }
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

    // Track ALL DMs — store messages and manage unread badges
    const unsubDM = wsClient.on('lobby_dm', (msg: OutboundMessage) => {
      const senderId = msg.callerId || '';
      const isMine = senderId === myIdRef.current;

      // Determine the peer ID (the other person in this conversation)
      // If I sent it, peer is the target (we don't have targetId in response, use from/callerId logic)
      // For echoes of my messages, we need to figure out the peer differently
      // The server sends lobby_dm to both sender (echo) and receiver
      // We'll key messages by peer ID

      const dmMsg: DmMessage = {
        id: ++dmMsgId,
        from: msg.from || '',
        senderId,
        original: msg.original || '',
        translated: msg.translated || msg.original || '',
        isMine,
        translationFailed: msg.translationFailed,
        ts: msg.ts || Math.floor(Date.now() / 1000),
      };

      if (isMine) {
        // Echo of my own message — store under the conversation partner
        // We need to find who we sent it to. The server echoes back with same fields.
        // We'll skip storing echoes here — LobbyChat handles optimistic add + echo update
        return;
      }

      // Message from someone else — store under their ID
      setDmMessages((prev) => ({
        ...prev,
        [senderId]: [...(prev[senderId] || []), dmMsg],
      }));

      // Track unread if chat not open with this user
      if (senderId !== openChatRef.current) {
        setUnreadDMs((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
        playMessageSound();
        incrementUnread();
      }
    });

    return () => {
      unsubUsers();
      unsubJoin();
      unsubLeft();
      unsubUpdate();
      unsubDM();
    };
  }, []);

  const setOpenChat = useCallback((userId: string | null) => {
    openChatRef.current = userId;
    if (userId) {
      // Clear unread for this user when opening chat
      setUnreadDMs((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  }, []);

  const addDmMessage = useCallback((peerId: string, msg: DmMessage) => {
    setDmMessages((prev) => ({
      ...prev,
      [peerId]: [...(prev[peerId] || []), msg],
    }));
  }, []);

  const updateLastDm = useCallback((peerId: string, original: string, updates: Partial<DmMessage>) => {
    setDmMessages((prev) => {
      const msgs = prev[peerId];
      if (!msgs) return prev;
      const idx = msgs.findLastIndex((m) => m.isMine && m.original === original);
      if (idx === -1) return prev;
      const updated = [...msgs];
      updated[idx] = { ...updated[idx], ...updates };
      return { ...prev, [peerId]: updated };
    });
  }, []);

  const loading = isInLobby && !usersReceived;

  return { users, isInLobby, loading, myId, unreadDMs, dmMessages, setOpenChat, addDmMessage, updateLastDm, joinLobby, leaveLobby };
}
