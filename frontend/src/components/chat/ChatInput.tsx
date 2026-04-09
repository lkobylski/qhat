import { useState } from 'react';

const MAX_LENGTH = 450;

interface ChatInputProps {
  onSend: (text: string) => void;
  onTyping?: () => void;
}

export function ChatInput({ onSend, onTyping }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && text.length <= MAX_LENGTH) {
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

  const overLimit = text.length > MAX_LENGTH;
  const showCounter = text.length > MAX_LENGTH * 0.8;

  return (
    <form onSubmit={handleSubmit} className="shrink-0 bg-slate-900 px-4 pb-3 pt-1">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Message text"
            maxLength={MAX_LENGTH + 10}
            className={`w-full rounded-full border bg-slate-800 px-4 py-2 pr-14 text-base text-white placeholder-slate-400 focus:outline-none ${
              overLimit ? 'border-red-500 focus:border-red-500' : 'border-slate-600 focus:border-slate-500'
            }`}
          />
          {showCounter && (
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] ${
              overLimit ? 'text-red-400' : 'text-slate-500'
            }`}>
              {text.length}/{MAX_LENGTH}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={!text.trim() || overLimit}
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
