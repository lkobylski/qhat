import { useState, useEffect, useCallback } from 'react';
import { wsClient } from '../../lib/wsClient';
import type { InboundMessage } from '../../types/ws';

const EMOJIS = ['👍', '❤️', '😂', '😮', '🎉', '🔥'];

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number; // percentage from left
}

let emojiId = 0;

interface ReactionsProps {
  send: (msg: InboundMessage) => void;
}

export function Reactions({ send }: ReactionsProps) {
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const addFloating = useCallback((emoji: string) => {
    const id = ++emojiId;
    const x = 20 + Math.random() * 60; // 20-80% from left
    setFloating((prev) => [...prev, { id, emoji, x }]);
    // Remove after animation
    setTimeout(() => {
      setFloating((prev) => prev.filter((e) => e.id !== id));
    }, 2000);
  }, []);

  const sendReaction = useCallback(
    (emoji: string) => {
      send({ type: 'reaction', text: emoji });
      addFloating(emoji);
      setShowPicker(false);
    },
    [send, addFloating]
  );

  // Listen for peer reactions (relayed raw, text field in JSON)
  useEffect(() => {
    const unsub = wsClient.on('reaction', (msg) => {
      // Raw relayed message has "text" field
      const emoji = (msg as unknown as { text?: string }).text;
      if (emoji) {
        addFloating(emoji);
      }
    });
    return unsub;
  }, [addFloating]);

  return (
    <>
      {/* Floating emoji animations */}
      {floating.map((e) => (
        <div
          key={e.id}
          className="absolute z-30 pointer-events-none animate-float-up"
          style={{ left: `${e.x}%`, bottom: '10%' }}
        >
          <span className="text-4xl drop-shadow-lg">{e.emoji}</span>
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

      {/* CSS animation */}
      <style>{`
        @keyframes float-up {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-300px) scale(1.5); }
        }
        .animate-float-up {
          animation: float-up 2s ease-out forwards;
        }
      `}</style>
    </>
  );
}
