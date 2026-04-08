import { useState, useCallback, useRef, useEffect } from 'react';

export type VideoQuality = 'auto' | 'fhd' | 'hd' | 'sd' | 'low';

const QUALITY_CONSTRAINTS: Record<VideoQuality, MediaTrackConstraints> = {
  auto: { facingMode: 'user' },
  fhd: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 }, facingMode: 'user' },
  hd: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: 'user' },
  sd: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 }, facingMode: 'user' },
  low: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 }, facingMode: 'user' },
};

export function useMedia() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<VideoQuality>(
    () => (sessionStorage.getItem('videoQuality') as VideoQuality) || 'auto'
  );
  const streamRef = useRef<MediaStream | null>(null);
  const qualityRef = useRef(quality);
  qualityRef.current = quality;

  const requestPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: QUALITY_CONSTRAINTS[qualityRef.current],
        audio: true,
      });
      streamRef.current = stream;
      setLocalStream(stream);
      setError(null);
    } catch (err) {
      console.warn('Media permissions denied, continuing in text-only mode:', err);
      setError('Camera/microphone access denied. You can still use text chat.');
      setLocalStream(null);
    }
  }, []);

  const changeQuality = useCallback(async (newQuality: VideoQuality) => {
    setQuality(newQuality);
    sessionStorage.setItem('videoQuality', newQuality);

    // Re-acquire video track with new constraints
    const stream = streamRef.current;
    if (!stream) return;

    const oldTrack = stream.getVideoTracks()[0];
    if (!oldTrack) return;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: QUALITY_CONSTRAINTS[newQuality],
        audio: false,
      });
      const newTrack = newStream.getVideoTracks()[0];

      // Replace track in existing stream
      stream.removeTrack(oldTrack);
      oldTrack.stop();
      stream.addTrack(newTrack);

      // Trigger re-render with same stream ref (React needs new object)
      setLocalStream(new MediaStream(stream.getTracks()));
      streamRef.current = stream;
    } catch {
      // If new constraints fail, keep current track
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setVideoEnabled((prev) => !prev);
  }, []);

  const toggleAudio = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setAudioEnabled((prev) => !prev);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    localStream,
    videoEnabled,
    audioEnabled,
    toggleVideo,
    toggleAudio,
    requestPermissions,
    changeQuality,
    quality,
    error,
  };
}
