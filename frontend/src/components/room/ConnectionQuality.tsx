interface ConnectionQualityProps {
  quality: 'good' | 'ok' | 'poor' | '';
  rtt: number;
}

export function ConnectionQuality({ quality, rtt }: ConnectionQualityProps) {
  if (!quality) return null;

  const bars = quality === 'good' ? 3 : quality === 'ok' ? 2 : 1;
  const color = quality === 'good' ? '#4ade80' : quality === 'ok' ? '#facc15' : '#f87171';
  const label = quality === 'good' ? 'Good' : quality === 'ok' ? 'Fair' : 'Poor';

  return (
    <div className="flex items-center gap-1" title={`${label} (${rtt}ms)`}>
      <svg width="14" height="12" viewBox="0 0 14 12" className="shrink-0">
        <rect x="0" y="8" width="3" height="4" rx="0.5" fill={bars >= 1 ? color : '#4b5563'} />
        <rect x="5" y="4" width="3" height="8" rx="0.5" fill={bars >= 2 ? color : '#4b5563'} />
        <rect x="10" y="0" width="3" height="12" rx="0.5" fill={bars >= 3 ? color : '#4b5563'} />
      </svg>
      <span style={{ color }} className="text-[10px] font-mono">{rtt}ms</span>
    </div>
  );
}
