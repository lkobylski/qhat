import { useState } from 'react';

interface WaitingScreenProps {
  roomId: string;
}

export function WaitingScreen({ roomId }: WaitingScreenProps) {
  const roomCode = roomId.slice(0, 6);
  const roomUrl = `${window.location.origin}/room/${roomId}`;
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="mx-auto max-w-sm space-y-6 text-center">
      {/* Pulsing indicator */}
      <div className="flex justify-center">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <div className="absolute h-12 w-12 animate-ping rounded-full bg-blue-500/20" />
          <div className="relative h-5 w-5 rounded-full bg-blue-500" />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white">Waiting for someone to join</h2>
        <p className="mt-1 text-sm text-slate-400">Share the code or link below</p>
      </div>

      {/* Room code */}
      <div className="rounded-2xl bg-slate-800 p-5 shadow-inner">
        <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Room code</p>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-3xl font-bold tracking-[0.25em] text-white">
            {roomCode}
          </span>
          <button
            onClick={() => copy(roomCode, setCodeCopied)}
            className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors"
          >
            {codeCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Share link */}
      <div className="rounded-2xl bg-slate-800 p-4">
        <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Or share link</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={roomUrl}
            className="flex-1 rounded-lg bg-slate-700/50 px-3 py-2 text-xs text-slate-400 focus:outline-none"
          />
          <button
            onClick={() => copy(roomUrl, setLinkCopied)}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
          >
            {linkCopied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}
