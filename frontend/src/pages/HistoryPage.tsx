import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoomHistory, loadChatMessages, deleteRoomHistoryEntry } from '../lib/roomHistory';
import { LANGUAGES } from '../lib/constants';
import type { ChatMessage } from '../types/ws';

export function HistoryPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const history = getRoomHistory();
  const entry = history.find((h) => h.code === code);
  const messages = code ? loadChatMessages(code) : [];

  if (!entry || !code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-800">
        <div className="text-center text-white">
          <p className="text-lg">Conversation not found</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-500"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const langName = (c: string) => LANGUAGES.find((l) => l.code === c)?.name || c;

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    if (min < 60) return `${min}m ${s}s`;
    const hr = Math.floor(min / 60);
    return `${hr}h ${min % 60}m`;
  };

  const [copied, setCopied] = useState(false);

  const handleDelete = () => {
    deleteRoomHistoryEntry(code);
    navigate('/');
  };

  const handleRejoin = () => {
    navigate(`/c/${code}`);
  };

  const handleShareLink = async () => {
    const url = `${window.location.origin}/c/${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'qhat', text: `Join my video chat!`, url });
        return;
      } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-800 px-4">
      <div className="flex h-[90vh] w-[min(95vw,500px)] flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">

        {/* Header */}
        <div className="shrink-0 border-b border-slate-700 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="mb-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            &larr; Back
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
              {entry.peerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-white truncate">
                {entry.peerName}
                {entry.fromLobby && <span className="ml-2 text-[10px] text-slate-500">lobby</span>}
              </h1>
              <div className="text-xs text-slate-400">
                {langName(entry.myLang)} &rarr; {langName(entry.peerLang)}
                {entry.durationSec > 0 && <span className="ml-2">{formatDuration(entry.durationSec)}</span>}
                <span className="ml-2">{new Date(entry.date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat messages (read-only) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-500">No messages saved</p>
            </div>
          ) : (
            messages.map((msg) => (
              <HistoryBubble key={msg.id} message={msg} />
            ))
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 space-y-2 border-t border-slate-700 px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={handleRejoin}
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              Rejoin room
            </button>
            <button
              onClick={handleShareLink}
              className="flex-1 rounded-xl bg-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-600 transition-colors"
            >
              {copied ? 'Link copied!' : 'Share room link'}
            </button>
          </div>
          <button
            onClick={handleDelete}
            className="w-full rounded-xl py-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Delete from history
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryBubble({ message }: { message: ChatMessage }) {
  const time = new Date(message.ts * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const showTranslation =
    message.translated &&
    message.translated !== message.original &&
    !message.translationFailed;

  const nameColor = message.isMine ? 'text-fuchsia-400' : 'text-blue-400';

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-lg bg-slate-800 px-3 py-1.5">
        <div className="flex items-baseline gap-2">
          <span className={`text-xs font-semibold ${nameColor}`}>{message.from}</span>
          <span className="text-[9px] text-slate-600">{time}</span>
        </div>
        {showTranslation ? (
          <>
            <div className="text-sm text-white">{message.translated}</div>
            <div className="text-[11px] text-slate-500 italic">{message.original}</div>
          </>
        ) : (
          <div className="text-sm text-white">{message.original}</div>
        )}
        {message.translationFailed && (
          <div className="text-[11px] text-amber-400 italic">Translation unavailable</div>
        )}
      </div>
    </div>
  );
}
