import { useEffect, useRef } from 'react';
import type { CameraDevice } from '../../hooks/useMedia';

interface CameraPreviewProps {
  stream: MediaStream | null;
  onRequestCamera: () => Promise<void>;
  cameras: CameraDevice[];
  activeCameraId: string;
  onCameraChange: (deviceId: string) => void;
  audioEnabled: boolean;
  videoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

export function CameraPreview({ stream, onRequestCamera, cameras, activeCameraId, onCameraChange, audioEnabled, videoEnabled, onToggleAudio, onToggleVideo }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Auto-request camera on mount
  useEffect(() => {
    if (!stream) {
      onRequestCamera();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!stream) {
    return (
      <div className="flex h-40 w-56 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mx-auto mb-2 h-8 w-8 text-slate-500">
            <path d="M.97 3.97a.75.75 0 0 1 1.06 0l15 15a.75.75 0 1 1-1.06 1.06l-15-15a.75.75 0 0 1 0-1.06ZM17.25 16.06l2.69 2.69c.944.945 2.56.276 2.56-1.06V6.31c0-1.336-1.616-2.005-2.56-1.06l-2.69 2.69v8.12ZM15.75 7.5v8.068L4.682 4.5H13.5a2.25 2.25 0 0 1 2.25 2.25v.75Zm-12 .75v7.5a2.25 2.25 0 0 0 2.25 2.25h5.068L3.75 10.568V8.25Z" />
          </svg>
          <p className="text-xs text-slate-500">Camera off</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-40 w-56 overflow-hidden rounded-2xl border-2 border-slate-700 shadow-lg">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
      </div>
      {/* Media toggles */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleAudio}
          title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          className={`rounded-full p-2 transition-colors ${audioEnabled ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-600 text-white hover:bg-red-500'}`}
        >
          {audioEnabled ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" />
              <path d="M5.5 9.643a.75.75 0 0 0-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.5 4.5 0 0 1-9 0v-.357Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" />
              <path d="M5.5 9.643a.75.75 0 0 0-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.5 4.5 0 0 1-9 0v-.357Z" />
              <path d="M2.22 2.22a.75.75 0 0 1 1.06 0l14.5 14.5a.75.75 0 1 1-1.06 1.06L2.22 3.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          )}
        </button>
        <button
          onClick={onToggleVideo}
          title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
          className={`rounded-full p-2 transition-colors ${videoEnabled ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-600 text-white hover:bg-red-500'}`}
        >
          {videoEnabled ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M3.25 4A2.25 2.25 0 0 0 1 6.25v7.5A2.25 2.25 0 0 0 3.25 16h7.5A2.25 2.25 0 0 0 13 13.75v-7.5A2.25 2.25 0 0 0 10.75 4h-7.5ZM19 4.75a.75.75 0 0 0-1.28-.53l-3 3a.75.75 0 0 0-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 0 0 1.28-.53V4.75Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M1 13.75V6.25A2.25 2.25 0 0 1 3.25 4h7.5A2.25 2.25 0 0 1 13 6.25v1.665l3.72-3.72a.75.75 0 0 1 1.28.53v10.55a.75.75 0 0 1-1.28.53L13 12.085v1.665A2.25 2.25 0 0 1 10.75 16h-7.5A2.25 2.25 0 0 1 1 13.75Z" />
              <path d="M2.22 2.22a.75.75 0 0 1 1.06 0l14.5 14.5a.75.75 0 1 1-1.06 1.06L2.22 3.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          )}
        </button>
        {cameras.length > 1 && (
          <select
            value={activeCameraId}
            onChange={(e) => onCameraChange(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          >
            {cameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
