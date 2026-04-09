import { useEffect, useRef } from 'react';
import { SelfVideo } from './SelfVideo';

interface VideoPanelProps {
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  peerName: string;
  peerAudioEnabled?: boolean;
  peerVideoEnabled?: boolean;
}

export function VideoPanel({ remoteStream, localStream, peerName, peerAudioEnabled = true, peerVideoEnabled = true }: VideoPanelProps) {
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
      {/* Peer mute indicators */}
      {(!peerAudioEnabled || !peerVideoEnabled) && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5">
          {!peerAudioEnabled && (
            <div className="flex items-center gap-1 rounded-full bg-red-600/80 px-2 py-1 text-xs text-white backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path d="M5.5 3.5A2.5 2.5 0 0 1 10.03 2.3a.75.75 0 0 0 1.094-1.028A4 4 0 0 0 4 3.5v4a.75.75 0 0 0 1.5 0v-4Z" />
                <path d="M1.22 1.22a.75.75 0 0 1 1.06 0l12.5 12.5a.75.75 0 0 1-1.06 1.06L1.22 2.28a.75.75 0 0 1 0-1.06Z" />
                <path d="M6 7.5v.379l5.39 5.39A5.501 5.501 0 0 1 2.5 8a.75.75 0 0 0-1.5 0 7.002 7.002 0 0 0 6.25 6.958V16.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.542A7.002 7.002 0 0 0 15 8a.75.75 0 0 0-1.5 0A5.5 5.5 0 0 1 8 13.5a5.475 5.475 0 0 1-2-1.5" />
              </svg>
              Muted
            </div>
          )}
          {!peerVideoEnabled && (
            <div className="flex items-center gap-1 rounded-full bg-red-600/80 px-2 py-1 text-xs text-white backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path d="M1 4.25A2.25 2.25 0 0 1 3.25 2h5.5A2.25 2.25 0 0 1 11 4.25v.32l3.029-1.078A1 1 0 0 1 15.5 4.43v7.14a1 1 0 0 1-1.471.938L11 11.43v.32A2.25 2.25 0 0 1 8.75 14h-5.5A2.25 2.25 0 0 1 1 11.75v-7.5Z" />
                <path d="M.22.22a.75.75 0 0 1 1.06 0l14.5 14.5a.75.75 0 1 1-1.06 1.06L.22 1.28a.75.75 0 0 1 0-1.06Z" />
              </svg>
              Cam off
            </div>
          )}
        </div>
      )}
      <SelfVideo stream={localStream} />
    </>
  );
}
