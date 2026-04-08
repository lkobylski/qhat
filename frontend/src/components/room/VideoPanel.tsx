import { useEffect, useRef } from 'react';
import { SelfVideo } from './SelfVideo';

interface VideoPanelProps {
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  peerName: string;
}

export function VideoPanel({ remoteStream, localStream, peerName }: VideoPanelProps) {
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (remoteRef.current && remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <>
      {remoteStream ? (
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-400">
          <div className="text-center">
            <div className="mb-2 text-6xl font-light">
              {peerName.charAt(0).toUpperCase()}
            </div>
            <div className="text-sm">Connecting video...</div>
          </div>
        </div>
      )}
      <SelfVideo stream={localStream} />
    </>
  );
}
