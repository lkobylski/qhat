import { useState, useCallback, useEffect, useRef } from 'react';
import { wsClient } from '../lib/wsClient';
import { playMessageSound } from '../lib/sounds';
import type { InboundMessage, OutboundMessage, ChatMessage } from '../types/ws';

interface UseChatParams {
  myName: string;
  myLang: string;
  send: (msg: InboundMessage) => void;
}

let msgCounter = 0;

export function useChat({ myName, myLang, send }: UseChatParams) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peerTyping, setPeerTyping] = useState(false);
  const pendingTexts = useRef<Set<string>>(new Set());
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      pendingTexts.current.add(text);

      const msg: ChatMessage = {
        id: `local-${++msgCounter}`,
        from: myName,
        original: text,
        translated: '',
        langFrom: myLang,
        langTo: '',
        ts: Math.floor(Date.now() / 1000),
        isMine: true,
      };
      setMessages((prev) => [...prev, msg]);

      send({ type: 'chat', text, lang: myLang });
    },
    [myName, myLang, send]
  );

  // Send typing indicator (throttled to max once per 2s)
  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      send({ type: 'typing' });
    }
  }, [send]);

  useEffect(() => {
    const unsub = wsClient.on('chat', (msg: OutboundMessage) => {
      const isMine = msg.from === myName;

      // Peer sent a message — they're no longer typing
      if (!isMine) {
        setPeerTyping(false);
      }

      if (isMine && pendingTexts.current.has(msg.original || '')) {
        pendingTexts.current.delete(msg.original || '');
        setMessages((prev) => {
          const idx = prev.findIndex(
            (m) => m.isMine && m.original === msg.original && m.id.startsWith('local-')
          );
          if (idx === -1) return prev;

          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            translated: msg.translated || '',
            langTo: msg.langTo || '',
            translationFailed: msg.translationFailed,
          };
          return updated;
        });
        return;
      }

      const chatMsg: ChatMessage = {
        id: `remote-${++msgCounter}`,
        from: msg.from || 'Unknown',
        original: msg.original || '',
        translated: msg.translated || msg.original || '',
        langFrom: msg.langFrom || '',
        langTo: msg.langTo || '',
        ts: msg.ts || Math.floor(Date.now() / 1000),
        isMine: false,
        translationFailed: msg.translationFailed,
      };
      setMessages((prev) => [...prev, chatMsg]);
      playMessageSound();
    });

    const unsubTyping = wsClient.on('typing', () => {
      setPeerTyping(true);
      // Clear previous timer
      if (typingTimer.current) clearTimeout(typingTimer.current);
      // Hide after 3s of no typing
      typingTimer.current = setTimeout(() => setPeerTyping(false), 3000);
    });

    return () => {
      unsub();
      unsubTyping();
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [myName]);

  return { messages, sendMessage, peerTyping, sendTyping };
}
