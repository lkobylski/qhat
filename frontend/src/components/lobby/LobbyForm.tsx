import { useState } from 'react';
import { LanguageSelect } from '../shared/LanguageSelect';

interface LobbyFormProps {
  onJoin: (name: string, lang: string) => void;
  isJoining?: boolean;
}

export function LobbyForm({ onJoin, isJoining }: LobbyFormProps) {
  const [name, setName] = useState('');
  const [lang, setLang] = useState(() => sessionStorage.getItem('userLang') || 'EN');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim(), lang);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-300">
          Your name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          maxLength={30}
          required
          autoFocus
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="lang" className="mb-2 block text-sm font-medium text-slate-300">
          Your language
        </label>
        <LanguageSelect value={lang} onChange={setLang} className="w-full" />
      </div>
      <button
        type="submit"
        disabled={!name.trim()}
        className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-md hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
      >
        {isJoining ? 'Join conversation' : 'Enter room'}
      </button>
    </form>
  );
}
