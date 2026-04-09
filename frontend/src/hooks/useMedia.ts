import { useState, useCallback, useRef, useEffect } from 'react';

export type VideoQuality = 'auto' | 'fhd' | 'hd' | 'sd' | 'low';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

const QUALITY_CONSTRAINTS: Record<VideoQuality, MediaTrackConstraints> = {
  auto: { facingMode: 'user' },
  fhd: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 }, facingMode: 'user' },
  hd: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: 'user' },
  sd: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 }, facingMode: 'user' },
  low: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 }, facingMode: 'user' },
};

function buildVideoConstraints(quality: VideoQuality, deviceId?: string): MediaTrackConstraints {
  const base = { ...QUALITY_CONSTRAINTS[quality] };
  if (deviceId) {
    delete base.facingMode;
    base.deviceId = { exact: deviceId };
  }
  return base;
}

export function useMedia() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(
    () => sessionStorage.getItem('videoEnabled') !== 'false'
  );
  const [audioEnabled, setAudioEnabled] = useState(
    () => sessionStorage.getItem('audioEnabled') !== 'false'
  );
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<VideoQuality>(
    () => (sessionStorage.getItem('videoQuality') as VideoQuality) || 'auto'
  );
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>(
    () => sessionStorage.getItem('cameraDeviceId') || ''
  );
  const streamRef = useRef<MediaStream | null>(null);
  const qualityRef = useRef(quality);
  const cameraRef = useRef(activeCameraId);
  qualityRef.current = quality;
  cameraRef.current = activeCameraId;

  const enumerateCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
      setCameras(videoDevices);
    } catch {
      // enumeration failed
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: buildVideoConstraints(qualityRef.current, cameraRef.current || undefined),
        audio: true,
      });
      streamRef.current = stream;
      setLocalStream(stream);
      setError(null);

      // Enumerate cameras after permission granted (labels available now)
      await enumerateCameras();

      // Apply saved mic/cam preferences
      const savedAudio = sessionStorage.getItem('audioEnabled') !== 'false';
      const savedVideo = sessionStorage.getItem('videoEnabled') !== 'false';
      stream.getAudioTracks().forEach((t) => { t.enabled = savedAudio; });
      stream.getVideoTracks().forEach((t) => { t.enabled = savedVideo; });
      setAudioEnabled(savedAudio);
      setVideoEnabled(savedVideo);

      // Track which camera is actually active
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        if (settings.deviceId) {
          setActiveCameraId(settings.deviceId);
          cameraRef.current = settings.deviceId;
        }
      }
    } catch (err) {
      console.warn('Media permissions denied, continuing in text-only mode:', err);
      setError('Camera/microphone access denied. You can still use text chat.');
      setLocalStream(null);
    }
  }, [enumerateCameras]);

  const replaceVideoTrack = useCallback(async (constraints: MediaTrackConstraints) => {
    const stream = streamRef.current;
    if (!stream) return;

    const oldTrack = stream.getVideoTracks()[0];
    if (!oldTrack) return;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: constraints,
        audio: false,
      });
      const newTrack = newStream.getVideoTracks()[0];

      stream.removeTrack(oldTrack);
      oldTrack.stop();
      stream.addTrack(newTrack);

      setLocalStream(new MediaStream(stream.getTracks()));
      streamRef.current = stream;

      // Update active camera
      const settings = newTrack.getSettings();
      if (settings.deviceId) {
        setActiveCameraId(settings.deviceId);
        cameraRef.current = settings.deviceId;
      }
    } catch {
      // Keep current track on failure
    }
  }, []);

  const changeCamera = useCallback(async (deviceId: string) => {
    setActiveCameraId(deviceId);
    cameraRef.current = deviceId;
    sessionStorage.setItem('cameraDeviceId', deviceId);
    await replaceVideoTrack(buildVideoConstraints(qualityRef.current, deviceId));
  }, [replaceVideoTrack]);

  const changeQuality = useCallback(async (newQuality: VideoQuality) => {
    setQuality(newQuality);
    qualityRef.current = newQuality;
    sessionStorage.setItem('videoQuality', newQuality);
    await replaceVideoTrack(buildVideoConstraints(newQuality, cameraRef.current || undefined));
  }, [replaceVideoTrack]);

  const toggleVideo = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setVideoEnabled((prev) => {
      sessionStorage.setItem('videoEnabled', String(!prev));
      return !prev;
    });
  }, []);

  const toggleAudio = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setAudioEnabled((prev) => {
      sessionStorage.setItem('audioEnabled', String(!prev));
      return !prev;
    });
  }, []);

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLocalStream(null);
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
    stopMedia,
    changeQuality,
    quality,
    cameras,
    activeCameraId,
    changeCamera,
    error,
  };
}
