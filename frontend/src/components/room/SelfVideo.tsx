import { useEffect, useRef } from 'react';

interface SelfVideoProps {
  stream: MediaStream | null;
}

export function SelfVideo({ stream }: SelfVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <div className="absolute top-3 right-3 z-10 h-28 w-40 overflow-hidden rounded-lg border-2 border-white/20 shadow-xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
    </div>
  );
}
