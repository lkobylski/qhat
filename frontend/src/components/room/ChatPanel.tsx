import { useEffect, useRef, useState } from 'react';
import { MessageBubble } from '../chat/MessageBubble';
import type { ChatMessage } from '../../types/ws';

interface ChatPanelProps {
  messages: ChatMessage[];
  peerTyping: boolean;
  peerName: string;
}

export function ChatPanel({ messages, peerTyping, peerName }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!collapsed) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, peerTyping, collapsed]);

  const hasContent = messages.length > 0 || peerTyping;
  if (!hasContent) return null;

  const lastMessage = messages[messages.length - 1];

  return (
    <div className="px-3 pb-2">
      {/* Toggle button */}
      {messages.length > 0 && (
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
      )}

      {collapsed ? (
        <>
          {lastMessage && <MessageBubble message={lastMessage} />}
          {peerTyping && <TypingBubble name={peerName} />}
        </>
      ) : (
        <div
          ref={scrollRef}
          className="flex flex-col gap-1 overflow-y-auto"
          style={{ maxHeight: '35vh' }}
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {peerTyping && <TypingBubble name={peerName} />}
        </div>
      )}
    </div>
  );
}

function TypingBubble({ name }: { name: string }) {
  return (
    <div className="flex justify-start">
      <div className="rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur-sm">
        <span className="text-xs font-semibold text-blue-300">{name} </span>
        <span className="inline-flex gap-[3px] align-middle">
          <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}
