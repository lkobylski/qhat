import { useState } from 'react';
import { QualitySelector } from './QualitySelector';
import { CameraSelector } from './CameraSelector';
import type { VideoQuality, CameraDevice } from '../../hooks/useMedia';

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
  cameras: CameraDevice[];
  activeCameraId: string;
  onCameraChange: (deviceId: string) => void;
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
  cameras,
  activeCameraId,
  onCameraChange,
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

  const btnBase = "rounded-full p-2.5 transition-colors";
  const btnActive = "bg-slate-700 text-white hover:bg-slate-600";
  const btnOff = "bg-red-600 text-white hover:bg-red-500";

  return (
    <div className="flex shrink-0 items-center justify-center gap-2 bg-slate-900 px-4 py-2">
      <button
        onClick={handleShare}
        title={shared ? 'Copied!' : 'Share link'}
        className={`${btnBase} ${shared ? 'bg-green-600 text-white' : btnActive}`}
      >
        {shared ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
            <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
          </svg>
        )}
      </button>
      {hasMedia && (
        <>
          <button
            onClick={onToggleAudio}
            title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            className={`${btnBase} ${audioEnabled ? btnActive : btnOff}`}
          >
            {audioEnabled ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" />
                <path d="M5.5 9.643a.75.75 0 0 0-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.5 4.5 0 0 1-9 0v-.357Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M10 1a3 3 0 0 0-3 3v4.5a.75.75 0 0 1-1.5 0V4a4.5 4.5 0 0 1 9 0v.282a.75.75 0 0 1-1.5 0V4a3 3 0 0 0-3-3Z" />
                <path d="M2.22 2.22a.75.75 0 0 1 1.06 0l14.5 14.5a.75.75 0 1 1-1.06 1.06L2.22 3.28a.75.75 0 0 1 0-1.06Z" />
                <path d="M7.5 10V7.121L14 13.621A4.501 4.501 0 0 1 5.5 10v-.357a.75.75 0 0 0-1.5 0V10a6.001 6.001 0 0 0 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.48 4.48 0 0 1-.401 1.848L7.5 5.249V4a3 3 0 0 1 3-3 3 3 0 0 1 3 3v.282a.75.75 0 0 0 1.5 0V4A4.5 4.5 0 0 0 10 .5a4.5 4.5 0 0 0-4 2.459V4a3 3 0 0 1 .5-1.665V4v6Z" />
              </svg>
            )}
          </button>
          <button
            onClick={onToggleVideo}
            title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
            className={`${btnBase} ${videoEnabled ? btnActive : btnOff}`}
          >
            {videoEnabled ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M3.25 4A2.25 2.25 0 0 0 1 6.25v7.5A2.25 2.25 0 0 0 3.25 16h7.5A2.25 2.25 0 0 0 13 13.75v-7.5A2.25 2.25 0 0 0 10.75 4h-7.5ZM19 4.75a.75.75 0 0 0-1.28-.53l-3 3a.75.75 0 0 0-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 0 0 1.28-.53V4.75Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M1 13.75V6.25A2.25 2.25 0 0 1 3.25 4h7.5A2.25 2.25 0 0 1 13 6.25v1.665l3.72-3.72a.75.75 0 0 1 1.28.53v10.55a.75.75 0 0 1-1.28.53L13 12.085v1.665A2.25 2.25 0 0 1 10.75 16h-7.5A2.25 2.25 0 0 1 1 13.75Z" />
                <path d="M2.22 2.22a.75.75 0 0 1 1.06 0l14.5 14.5a.75.75 0 1 1-1.06 1.06L2.22 3.28a.75.75 0 0 1 0-1.06Z" />
              </svg>
            )}
          </button>
          <QualitySelector quality={videoQuality} onChange={onQualityChange} />
          <CameraSelector cameras={cameras} activeCameraId={activeCameraId} onChange={onCameraChange} />
        </>
      )}
      <button
        onClick={onLeave}
        title="Leave call"
        className={`${btnBase} bg-red-600 text-white hover:bg-red-500`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path fillRule="evenodd" d="M3.5 2A1.5 1.5 0 0 0 2 3.5v2.382a1.5 1.5 0 0 0 .776 1.316l2.06 1.133A1.5 1.5 0 0 0 6.275 8.2l.534-.903a11.06 11.06 0 0 1 6.382 0l.534.903a1.5 1.5 0 0 0 1.44.131l2.06-1.133A1.5 1.5 0 0 0 18 5.882V3.5A1.5 1.5 0 0 0 16.5 2h-13Z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
