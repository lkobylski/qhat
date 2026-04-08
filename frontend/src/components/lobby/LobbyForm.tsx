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
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
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
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="lang" className="mb-1 block text-sm font-medium text-gray-700">
          Your language
        </label>
        <LanguageSelect value={lang} onChange={setLang} className="w-full" />
      </div>
      <button
        type="submit"
        disabled={!name.trim()}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isJoining ? 'Join conversation' : 'Enter room'}
      </button>
    </form>
  );
}
