import { useState, useCallback, useEffect, useRef } from 'react';
import { wsClient } from '../lib/wsClient';
import type { InboundMessage, OutboundMessage, ChatMessage } from '../types/ws';

interface UseChatParams {
  myName: string;
  myLang: string;
  send: (msg: InboundMessage) => void;
}

let msgCounter = 0;

export function useChat({ myName, myLang, send }: UseChatParams) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Track pending optimistic messages waiting for server echo
  const pendingTexts = useRef<Set<string>>(new Set());

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      // Track this text so we can replace optimistic with server echo
      pendingTexts.current.add(text);

      // Optimistic add — will be replaced when server echoes back with translation
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

  useEffect(() => {
    const unsub = wsClient.on('chat', (msg: OutboundMessage) => {
      const isMine = msg.from === myName;

      if (isMine && pendingTexts.current.has(msg.original || '')) {
        // Server echo for our own message — replace optimistic with translated version
        pendingTexts.current.delete(msg.original || '');
        setMessages((prev) => {
          // Find the optimistic message and replace it
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

      // Message from peer
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
    });

    return unsub;
  }, [myName]);

  return { messages, sendMessage };
}
