import { useState } from 'react';
import { QualitySelector } from './QualitySelector';
import type { VideoQuality } from '../../hooks/useMedia';

interface MediaControlsProps {
  videoEnabled: boolean;
  audioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onLeave: () => void;
  hasMedia: boolean;
  roomId: string;
  videoQuality: VideoQuality;
  onQualityChange: (q: VideoQuality) => void;
}

export function MediaControls({
  videoEnabled,
  audioEnabled,
  onToggleVideo,
  onToggleAudio,
  onLeave,
  hasMedia,
  roomId,
  videoQuality,
  onQualityChange,
}: MediaControlsProps) {
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/c/${roomId}`;
    const code = roomId;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'qhat', text: `Join my video chat! Code: ${code}`, url });
        return;
      } catch { /* cancelled */ }
    }

    await navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div className="flex shrink-0 items-center justify-center gap-2 bg-slate-900 px-4 py-2">
      <button
        onClick={handleShare}
        className="rounded-full bg-slate-700 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-600 transition-colors"
      >
        {shared ? 'Copied!' : 'Share'}
      </button>
      {hasMedia && (
        <>
          <button
            onClick={onToggleAudio}
            className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
              audioEnabled
                ? 'bg-slate-700 text-white hover:bg-slate-600'
                : 'bg-red-600 text-white hover:bg-red-500'
            }`}
          >
            {audioEnabled ? 'Mic' : 'Mic Off'}
          </button>
          <button
            onClick={onToggleVideo}
            className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
              videoEnabled
                ? 'bg-slate-700 text-white hover:bg-slate-600'
                : 'bg-red-600 text-white hover:bg-red-500'
            }`}
          >
            {videoEnabled ? 'Cam' : 'Cam Off'}
          </button>
          <QualitySelector quality={videoQuality} onChange={onQualityChange} />
        </>
      )}
      <button
        onClick={onLeave}
        className="rounded-full bg-red-600 px-4 py-1.5 text-[11px] font-medium text-white hover:bg-red-500 transition-colors"
      >
        Leave
      </button>
    </div>
  );
}
