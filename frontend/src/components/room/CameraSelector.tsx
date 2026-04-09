import { useState } from 'react';
import type { CameraDevice } from '../../hooks/useMedia';

interface CameraSelectorProps {
  cameras: CameraDevice[];
  activeCameraId: string;
  onChange: (deviceId: string) => void;
}

export function CameraSelector({ cameras, activeCameraId, onChange }: CameraSelectorProps) {
  const [open, setOpen] = useState(false);

  if (cameras.length <= 1) return null;

  const activeLabel = cameras.find((c) => c.deviceId === activeCameraId)?.label || 'Camera';
  // Shorten label for display
  const shortLabel = activeLabel.length > 15 ? activeLabel.slice(0, 15) + '...' : activeLabel;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-slate-700 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-600 transition-colors"
        title={activeLabel}
      >
        {shortLabel}
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-52 rounded-lg bg-slate-800 shadow-xl border border-slate-700 overflow-hidden">
          {cameras.map((cam) => (
            <button
              key={cam.deviceId}
              onClick={() => {
                onChange(cam.deviceId);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
                cam.deviceId === activeCameraId
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cam.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
