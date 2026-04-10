import type { LobbyUser } from '../../types/ws';
import { LANGUAGES } from '../../lib/constants';

interface LobbyUserCardProps {
  user: LobbyUser;
  onCall: (userId: string) => void;
  onClick: (userId: string) => void;
  disabled: boolean;
  unreadCount?: number;
}

export function LobbyUserCard({ user, onCall, onClick, disabled, unreadCount }: LobbyUserCardProps) {
  const langName = LANGUAGES.find((l) => l.code === user.lang)?.name || user.lang;
  const isAvailable = user.status === 'available';

  return (
    <div
      onClick={() => onClick(user.id)}
      className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 cursor-pointer hover:bg-slate-750 hover:ring-1 hover:ring-slate-600 transition-all"
    >
      {/* Status dot */}
      <div
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          isAvailable ? 'bg-green-400' : 'bg-slate-500'
        }`}
      />

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{user.name}</div>
        <div className="text-xs text-slate-400">{langName}</div>
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
      {isAvailable ? (
        <button
          onClick={(e) => { e.stopPropagation(); onCall(user.id); }}
          disabled={disabled}
          className="shrink-0 rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Call
        </button>
      ) : (
        <span className="shrink-0 text-xs text-slate-500">In call</span>
      )}
    </div>
  );
}
