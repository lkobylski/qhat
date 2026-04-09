import { useEffect, useRef } from 'react';
import { playRingtone } from '../../lib/sounds';

interface IncomingCallModalProps {
  callerName: string;
  callerLang: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({ callerName, callerLang, onAccept, onDecline }: IncomingCallModalProps) {
  const ringtoneRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    ringtoneRef.current = playRingtone();
    return () => {
      ringtoneRef.current?.stop();
    };
  }, []);

  const handleAccept = () => {
    ringtoneRef.current?.stop();
    onAccept();
  };

  const handleDecline = () => {
    ringtoneRef.current?.stop();
    onDecline();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-xs rounded-2xl bg-slate-800 p-6 text-center shadow-2xl">
        {/* Avatar */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
          {callerName.charAt(0).toUpperCase()}
        </div>

        <h2 className="text-lg font-semibold text-white">{callerName}</h2>
        <p className="mt-1 text-sm text-slate-400">wants to video chat ({callerLang})</p>

        {/* Pulsing ring animation */}
        <div className="my-6 flex justify-center">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute h-10 w-10 animate-ping rounded-full bg-green-500/30" />
            <div className="relative h-6 w-6 rounded-full bg-green-500" />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-500 active:scale-[0.97] transition-all"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-500 active:scale-[0.97] transition-all"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
