import { useState, useEffect } from 'react';
import { LANGUAGES } from '../../lib/constants';
import { wsClient } from '../../lib/wsClient';
import type { InboundMessage, OutboundMessage } from '../../types/ws';

interface LanguageChangerProps {
  myLang: string;
  peerLang: string;
  send: (msg: InboundMessage) => void;
  onLangChange: (lang: string) => void;
}

export function LanguageChanger({ myLang, peerLang, send, onLangChange }: LanguageChangerProps) {
  const [open, setOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(myLang);
  const [peerCurrentLang, setPeerCurrentLang] = useState(peerLang);

  useEffect(() => {
    const unsub = wsClient.on('lang_change', (msg: OutboundMessage) => {
      if (msg.lang) {
        setPeerCurrentLang(msg.lang);
      }
    });
    return unsub;
  }, []);

  const handleChange = (lang: string) => {
    setCurrentLang(lang);
    send({ type: 'lang_change', lang });
    onLangChange(lang);
    sessionStorage.setItem('userLang', lang);
    setOpen(false);
  };

  return (
    <div className="absolute top-1 right-1 z-30">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-black/50 px-2 py-1 text-[10px] text-white/70 backdrop-blur-sm hover:bg-black/60 transition-colors font-mono"
      >
        {currentLang} → {peerCurrentLang || '?'}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 max-h-48 w-40 overflow-y-auto rounded-lg bg-slate-800 shadow-xl border border-slate-700">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`block w-full px-3 py-1.5 text-left text-xs transition-colors ${
                lang.code === currentLang
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
