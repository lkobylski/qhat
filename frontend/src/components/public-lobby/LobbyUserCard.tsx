import type { LobbyUser } from '../../types/ws';
import { LANGUAGES } from '../../lib/constants';

interface LobbyUserCardProps {
  user: LobbyUser;
  onCall: (userId: string) => void;
  onClick: (userId: string) => void;
  disabled: boolean;
  unreadCount?: number;
}

function formatLastSeen(ts?: number): string {
  if (!ts) return 'offline';
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function LobbyUserCard({ user, onCall, onClick, disabled, unreadCount }: LobbyUserCardProps) {
  const langName = LANGUAGES.find((l) => l.code === user.lang)?.name || user.lang;
  const isAvailable = user.status === 'available';
  const isOffline = user.status === 'offline';

  return (
    <div
      onClick={() => onClick(user.id)}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all ${
        isOffline
          ? 'bg-slate-800/50 opacity-60 hover:opacity-80'
          : 'bg-slate-800 hover:ring-1 hover:ring-slate-600'
      }`}
    >
      {/* Status dot */}
      <div
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          isAvailable ? 'bg-green-400' : isOffline ? 'bg-slate-600' : 'bg-yellow-500'
        }`}
      />

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${isOffline ? 'text-slate-400' : 'text-white'}`}>
          {user.name}
        </div>
        <div className="text-xs text-slate-400">
          {isOffline ? (
            <span className="text-slate-500">seen {formatLastSeen(user.lastSeen)}</span>
          ) : (
            langName
          )}
        </div>
      </div>

      {/* Chat indicator + unread badge */}
      <div className="relative shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${unreadCount ? 'text-blue-400' : 'text-slate-500'}`}>
          <path fillRule="evenodd" d="M10 3c-4.31 0-8 3.033-8 7 0 2.024.978 3.825 2.499 5.085a3.478 3.478 0 0 1-.522 1.756.75.75 0 0 0 .584 1.143 5.976 5.976 0 0 0 3.243-1.053c.7.146 1.44.069 2.196.069 4.31 0 8-3.033 8-7s-3.69-7-8-7Z" clipRule="evenodd" />
        </svg>
        {!!unreadCount && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {/* Action */}
      {isAvailable ? (
        <button
          onClick={(e) => { e.stopPropagation(); onCall(user.id); }}
          disabled={disabled}
          className="shrink-0 rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Call
        </button>
      ) : isOffline ? (
        <span className="shrink-0 text-[10px] text-slate-600">Offline</span>
      ) : (
        <span className="shrink-0 text-xs text-slate-500">In call</span>
      )}
    </div>
  );
}
