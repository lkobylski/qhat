import { useEffect, useRef } from 'react';

interface CameraPreviewProps {
  stream: MediaStream | null;
  onRequestCamera: () => Promise<void>;
}

export function CameraPreview({ stream, onRequestCamera }: CameraPreviewProps) {
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
    <div className="relative h-40 w-56 overflow-hidden rounded-2xl border-2 border-slate-700 shadow-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur-sm">
          Camera preview
        </span>
      </div>
    </div>
  );
}
