import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoomHistory, clearRoomHistory, type RoomHistoryEntry } from '../lib/roomHistory';
import { LANGUAGES } from '../lib/constants';

export function LandingPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [history, setHistory] = useState<RoomHistoryEntry[]>(() => getRoomHistory());

  // Clean stale lobby/room state
  sessionStorage.removeItem('fromLobby');
  sessionStorage.removeItem('fromLobbyName');
  sessionStorage.removeItem('fromLobbyLang');
  sessionStorage.removeItem('qhat_session');

  const generateCode = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    const arr = new Uint8Array(6);
    crypto.getRandomValues(arr);
    for (const byte of arr) {
      result += chars[byte % chars.length];
    }
    return result;
  };

  const handleCreate = () => {
    const code = generateCode();
    navigate(`/c/${code}`);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    navigate(`/c/${code.trim().toLowerCase()}`);
  };

  const langName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name || code;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-800 px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-white">
              <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 20.97V18.03a48.527 48.527 0 0 1-1.087-.128C2.905 17.58 1.5 15.833 1.5 13.773V6.385c0-2.06 1.405-3.813 3.413-4.127Z" />
              <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 0 0 1.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0 0 15.75 7.5Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">qhat</h1>
          <p className="mt-2 text-slate-400">
            Video chat with live translation
          </p>
        </div>

        {/* Create room */}
        <button
          onClick={handleCreate}
          className="w-full rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 active:scale-[0.98] transition-all"
        >
          Start a conversation
        </button>

        {/* Public lobby */}
        <button
          onClick={() => navigate('/lobby')}
          className="w-full rounded-xl bg-slate-700 px-6 py-3 text-base font-medium text-white hover:bg-slate-600 active:scale-[0.98] transition-all"
        >
          Public Lobby
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-slate-600" />
          <span className="text-xs text-slate-500 uppercase tracking-wide">or join with code</span>
          <div className="flex-1 border-t border-slate-600" />
        </div>

        {/* Join by code */}
        <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toLowerCase());
              setJoinError('');
            }}
            placeholder="e.g. a1b2c3"
            maxLength={6}
            className="flex-1 rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!code.trim()}
            className="rounded-xl bg-slate-700 px-5 py-3 text-base font-medium text-white hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Join
          </button>
        </form>

        {joinError && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{joinError}</p>
        )}

        {/* Room history */}
        {history.length > 0 && (
          <div className="text-left">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Recent conversations</h3>
              <button
                onClick={() => {
                  clearRoomHistory();
                  setHistory([]);
                }}
                className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {history.map((entry) => (
                <button
                  key={entry.code + entry.date}
                  onClick={() => navigate(`/c/${entry.code}`)}
                  className="flex w-full items-center gap-3 rounded-lg bg-slate-700/50 px-3 py-2 text-left hover:bg-slate-700 transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-600 text-xs font-bold text-white">
                    {entry.peerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                      {entry.peerName}
                      {entry.fromLobby && <span className="ml-1.5 text-[10px] text-slate-500">lobby</span>}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {langName(entry.myLang)} → {langName(entry.peerLang)}
                    </div>
                  </div>
                  <div className="shrink-0 text-[10px] text-slate-600">{formatDate(entry.date)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-slate-600 space-y-1">
          <p>No account needed. Rooms are temporary.</p>
          <button
            onClick={() => navigate('/privacy')}
            className="text-slate-500 hover:text-slate-300 underline transition-colors"
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
}
