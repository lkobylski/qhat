import { useState } from 'react';

interface MediaControlsProps {
  videoEnabled: boolean;
  audioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onLeave: () => void;
  hasMedia: boolean;
  roomId: string;
}

export function MediaControls({
  videoEnabled,
  audioEnabled,
  onToggleVideo,
  onToggleAudio,
  onLeave,
  hasMedia,
  roomId,
}: MediaControlsProps) {
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/room/${roomId}`;
    const code = roomId.slice(0, 6);

    // Try native share on mobile, fallback to clipboard
    if (navigator.share) {
      try {
        await navigator.share({ title: 'qhat', text: `Join my video chat! Code: ${code}`, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div className="flex shrink-0 items-center justify-center gap-3 bg-slate-900 px-4 py-2">
      <button
        onClick={handleShare}
        className="rounded-full bg-slate-700 px-4 py-2 text-xs font-medium text-white hover:bg-slate-600 transition-colors"
      >
        {shared ? 'Copied!' : 'Share'}
      </button>
      {hasMedia && (
        <>
          <button
            onClick={onToggleAudio}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              audioEnabled
                ? 'bg-slate-700 text-white hover:bg-slate-600'
                : 'bg-red-600 text-white hover:bg-red-500'
            }`}
          >
            {audioEnabled ? 'Mic On' : 'Mic Off'}
          </button>
          <button
            onClick={onToggleVideo}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              videoEnabled
                ? 'bg-slate-700 text-white hover:bg-slate-600'
                : 'bg-red-600 text-white hover:bg-red-500'
            }`}
          >
            {videoEnabled ? 'Cam On' : 'Cam Off'}
          </button>
        </>
      )}
      <button
        onClick={onLeave}
        className="rounded-full bg-red-600 px-5 py-2 text-xs font-medium text-white hover:bg-red-500 transition-colors"
      >
        Leave
      </button>
    </div>
  );
}
