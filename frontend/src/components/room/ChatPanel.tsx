import { useEffect, useRef, useState } from 'react';
import { MessageBubble } from '../chat/MessageBubble';
import type { ChatMessage } from '../../types/ws';

interface ChatPanelProps {
  messages: ChatMessage[];
}

export function ChatPanel({ messages }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!collapsed) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, collapsed]);

  if (messages.length === 0) return null;

  const lastMessage = messages[messages.length - 1];

  return (
    <div className="px-3 pb-2">
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="mb-1 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-0.5 text-[11px] text-white/60 backdrop-blur-sm hover:bg-black/50 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`h-3 w-3 transition-transform ${collapsed ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
        {collapsed ? 'Messages' : 'Collapse'}
      </button>

      {collapsed ? (
        /* Collapsed: only last message */
        <MessageBubble message={lastMessage} />
      ) : (
        /* Expanded: scrollable list */
        <div
          ref={scrollRef}
          className="flex flex-col gap-1 overflow-y-auto"
          style={{ maxHeight: '35vh' }}
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
      )}
    </div>
  );
}
