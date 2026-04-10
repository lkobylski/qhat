import { useState, useEffect, useRef } from 'react';
import { wsClient } from '../../lib/wsClient';
import { playMessageSound } from '../../lib/sounds';
import type { LobbyUser, OutboundMessage } from '../../types/ws';
import type { DmMessage } from '../../hooks/useLobby';

interface LobbyChatProps {
  user: LobbyUser;
  myId: string;
  myName: string;
  messages: DmMessage[];
  onAddMessage: (msg: DmMessage) => void;
  onUpdateMessage: (original: string, updates: Partial<DmMessage>) => void;
  onClose: () => void;
  onCall: () => void;
}

let localMsgId = 0;

export function LobbyChat({ user, myId, myName, messages, onAddMessage, onUpdateMessage, onClose, onCall }: LobbyChatProps) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Listen for echo of my sent messages (to update translation)
  useEffect(() => {
    const unsub = wsClient.on('lobby_dm', (msg: OutboundMessage) => {
      const senderId = msg.callerId || '';
      if (senderId !== myId) return; // only my echoes

      // Update optimistic message with translation
      onUpdateMessage(msg.original || '', {
        translated: msg.translated || '',
        translationFailed: msg.translationFailed,
      });
    });
    return unsub;
  }, [myId, onUpdateMessage]);

  // Listen for incoming messages from this user (play sound)
  useEffect(() => {
    const unsub = wsClient.on('lobby_dm', (msg: OutboundMessage) => {
      const senderId = msg.callerId || '';
      if (senderId === user.id) {
        playMessageSound();
      }
    });
    return unsub;
  }, [user.id]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || text.length > 450) return;

    const msg: DmMessage = {
      id: ++localMsgId,
      from: myName,
      senderId: myId,
      original: text.trim(),
      translated: '',
      isMine: true,
      ts: Math.floor(Date.now() / 1000),
    };
    onAddMessage(msg);

    wsClient.send({ type: 'lobby_dm', targetId: user.id, text: text.trim() });
    setText('');
  };

  const showTranslation = (msg: DmMessage) =>
    msg.translated && msg.translated !== msg.original && !msg.translationFailed;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 border-b border-slate-700 px-4 py-3">
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{user.name}</div>
            <div className="text-[10px] text-slate-400">{user.lang}</div>
          </div>
        </div>
        {user.status === 'available' && (
          <button
            onClick={onCall}
            className="shrink-0 rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-500 transition-colors"
          >
            Call
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-500">Say hi to {user.name}!</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="flex justify-start">
            <div className="max-w-[85%] rounded-lg bg-slate-800 px-3 py-1.5">
              <span className={`text-xs font-semibold ${msg.isMine ? 'text-fuchsia-400' : 'text-blue-400'}`}>
                {msg.from}:{' '}
              </span>
              {showTranslation(msg) ? (
                <>
                  <span className="text-sm text-white">{msg.translated}</span>
                  <div className="text-[11px] text-slate-500 italic">{msg.original}</div>
                </>
              ) : (
                <span className="text-sm text-white">{msg.original}</span>
              )}
              {msg.translationFailed && (
                <div className="text-[11px] text-amber-400 italic">Translation unavailable</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="shrink-0 border-t border-slate-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${user.name}...`}
            maxLength={460}
            autoFocus
            className="flex-1 rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-base text-white placeholder-slate-400 focus:border-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim() || text.length > 450}
            className="rounded-full bg-blue-600 p-2.5 text-white transition-colors hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
