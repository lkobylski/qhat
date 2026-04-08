import { useState } from 'react';
import type { VideoQuality } from '../../hooks/useMedia';

const QUALITY_OPTIONS: { value: VideoQuality; label: string; desc: string }[] = [
  { value: 'auto', label: 'Auto', desc: 'Browser decides' },
  { value: 'fhd', label: 'Full HD', desc: '1080p 30fps' },
  { value: 'hd', label: 'HD', desc: '720p 30fps' },
  { value: 'sd', label: 'SD', desc: '480p 24fps' },
  { value: 'low', label: 'Low', desc: '240p 15fps' },
];

interface QualitySelectorProps {
  quality: VideoQuality;
  onChange: (q: VideoQuality) => void;
}

export function QualitySelector({ quality, onChange }: QualitySelectorProps) {
  const [open, setOpen] = useState(false);

  const current = QUALITY_OPTIONS.find((o) => o.value === quality);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-slate-700 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-600 transition-colors"
      >
        {current?.label || 'Auto'}
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-36 rounded-lg bg-slate-800 shadow-xl border border-slate-700 overflow-hidden">
          {QUALITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left transition-colors ${
                opt.value === quality
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="text-xs font-medium">{opt.label}</div>
              <div className="text-[10px] opacity-60">{opt.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
