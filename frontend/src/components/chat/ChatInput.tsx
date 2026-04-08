import { useState } from 'react';

interface ChatInputProps {
  onSend: (text: string) => void;
  onTyping?: () => void;
}

export function ChatInput({ onSend, onTyping }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (e.target.value.length > 0) {
      onTyping?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="shrink-0 bg-slate-900 px-4 pb-3 pt-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Message text"
          maxLength={1000}
          className="flex-1 rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-base text-white placeholder-slate-400 focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-full bg-slate-700 p-2.5 text-white transition-colors hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
          </svg>
        </button>
      </div>
    </form>
  );
}
