import type { LobbyUser } from '../../types/ws';
import { LANGUAGES } from '../../lib/constants';

interface LobbyUserCardProps {
  user: LobbyUser;
  onCall: (userId: string) => void;
  disabled: boolean;
}

export function LobbyUserCard({ user, onCall, disabled }: LobbyUserCardProps) {
  const langName = LANGUAGES.find((l) => l.code === user.lang)?.name || user.lang;
  const isAvailable = user.status === 'available';

  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3">
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

      {/* Call button or status */}
      {isAvailable ? (
        <button
          onClick={() => onCall(user.id)}
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
