interface CallingOverlayProps {
  targetName: string;
  onCancel: () => void;
}

export function CallingOverlay({ targetName, onCancel }: CallingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-xs rounded-2xl bg-slate-800 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-2xl font-bold text-white">
          {targetName.charAt(0).toUpperCase()}
        </div>

        <h2 className="text-lg font-semibold text-white">Calling {targetName}...</h2>
        <p className="mt-1 text-sm text-slate-400">Waiting for response</p>

        {/* Animated dots */}
        <div className="my-6 flex justify-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:300ms]" />
        </div>

        <button
          onClick={onCancel}
          className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-500 active:scale-[0.97] transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
