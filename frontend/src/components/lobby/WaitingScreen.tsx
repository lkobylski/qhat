interface WaitingScreenProps {
  roomId: string;
}

export function WaitingScreen({ roomId }: WaitingScreenProps) {
  const roomCode = roomId.slice(0, 6);
  const roomUrl = `${window.location.origin}/room/${roomId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(roomUrl);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
  };

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div className="animate-pulse text-lg font-medium text-gray-600">
        Waiting for someone to join...
      </div>

      <div className="space-y-3 rounded-lg bg-gray-50 p-4">
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500 uppercase">Room code</p>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-2xl font-bold tracking-widest text-gray-800">
              {roomCode}
            </span>
            <button
              onClick={copyCode}
              className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-300 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <p className="mb-1 text-xs font-medium text-gray-500 uppercase">Or share link</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={roomUrl}
              className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600"
            />
            <button
              onClick={copyLink}
              className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
