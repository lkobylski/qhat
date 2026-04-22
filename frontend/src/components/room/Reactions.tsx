import { useState, useEffect, useCallback } from 'react';
import { wsClient } from '../../lib/wsClient';
import type { InboundMessage } from '../../types/ws';

const EMOJIS = ['👍', '❤️', '😂', '😮', '🎉', '🔥', '🍆', '🍑', '🍒', '😭', '🥹', '😡', '🤬', '😈'];
const BURST_COUNT = 10;

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
}

let emojiId = 0;

interface ReactionsProps {
  send: (msg: InboundMessage) => void;
}

export function Reactions({ send }: ReactionsProps) {
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const addBurst = useCallback((emoji: string) => {
    const newEmojis: FloatingEmoji[] = [];
    for (let i = 0; i < BURST_COUNT; i++) {
      newEmojis.push({
        id: ++emojiId,
        emoji,
        x: 5 + Math.random() * 90,
        delay: Math.random() * 0.4,
        duration: 1.5 + Math.random() * 1.5,
        size: 1.5 + Math.random() * 1.5,
        drift: -30 + Math.random() * 60,
      });
    }
    setFloating((prev) => [...prev, ...newEmojis]);
    // Clean up after longest possible animation
    setTimeout(() => {
      const ids = new Set(newEmojis.map((e) => e.id));
      setFloating((prev) => prev.filter((e) => !ids.has(e.id)));
    }, 3500);
  }, []);

  const sendReaction = useCallback(
    (emoji: string) => {
      send({ type: 'reaction', text: emoji });
      addBurst(emoji);
      setShowPicker(false);
    },
    [send, addBurst]
  );

  // Listen for peer reactions
  useEffect(() => {
    const unsub = wsClient.on('reaction', (msg) => {
      const emoji = (msg as unknown as { text?: string }).text;
      if (emoji) {
        addBurst(emoji);
      }
    });
    return unsub;
  }, [addBurst]);

  return (
    <>
      {/* Floating emoji burst */}
      {floating.map((e) => (
        <div
          key={e.id}
          className="absolute z-30 pointer-events-none"
          style={{
            left: `${e.x}%`,
            bottom: '10%',
            animation: `emoji-burst ${e.duration}s ease-out ${e.delay}s forwards`,
            opacity: 0,
            ['--drift' as string]: `${e.drift}px`,
          }}
        >
          <span className="drop-shadow-lg" style={{ fontSize: `${e.size}rem` }}>{e.emoji}</span>
        </div>
      ))}

      {/* Emoji picker toggle */}
      <div className="absolute bottom-3 right-3 z-30">
        {showPicker && (
          <div className="mb-2 flex gap-1 rounded-full bg-black/60 px-2 py-1 backdrop-blur-sm">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="rounded-full p-1 text-xl hover:scale-125 active:scale-95 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="rounded-full bg-black/50 p-2 text-lg backdrop-blur-sm hover:bg-black/60 transition-colors"
        >
          😊
        </button>
      </div>

      <style>{`
        @keyframes emoji-burst {
          0% {
            opacity: 1;
            transform: translateY(0) translateX(0) scale(0.5) rotate(0deg);
          }
          20% {
            opacity: 1;
            transform: translateY(-80px) translateX(calc(var(--drift) * 0.3)) scale(1.2) rotate(15deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-400px) translateX(var(--drift)) scale(0.6) rotate(-10deg);
          }
        }
      `}</style>
    </>
  );
}
