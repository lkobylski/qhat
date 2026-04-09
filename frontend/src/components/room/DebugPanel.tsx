import { useState, useEffect, useCallback } from 'react';
import { ConnectionQuality } from './ConnectionQuality';
import { API_URL } from '../../lib/constants';

interface DebugPanelProps {
  connectionState: string;
  candidateType: string;
  quality: 'good' | 'ok' | 'poor' | '';
  rtt: number;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  wsConnected: boolean;
  roomPhase: string;
  peerName: string;
  videoQuality: string;
}

interface DebugData {
  rooms: number;
  lobbyUsers: number;
  env: string;
  deepl?: {
    used: number;
    limit: number;
    remaining: number;
    remainingPct: number;
  };
}

function formatCandidateType(raw: string): string {
  if (!raw) return 'none';
  const [type, protocol] = raw.split('/');
  switch (type) {
    case 'host': return `P2P direct (${protocol})`;
    case 'srflx': return `STUN/Google (${protocol})`;
    case 'relay': return `TURN server (${protocol})`;
    case 'prflx': return `P2P reflexive (${protocol})`;
    default: return raw;
  }
}

function formatBytes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

export function DebugPanel(props: DebugPanelProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DebugData | null>(null);

  const fetchDebug = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/debug`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch { /* ignore */ }
  }, []);

  // Fetch on open and every 30s while open
  useEffect(() => {
    if (!open) return;
    fetchDebug();
    const interval = setInterval(fetchDebug, 30000);
    return () => clearInterval(interval);
  }, [open, fetchDebug]);

  const deeplPct = data?.deepl?.remainingPct ?? null;
  const deeplColor = deeplPct === null ? 'text-slate-500'
    : deeplPct > 50 ? 'text-green-400'
    : deeplPct > 20 ? 'text-yellow-400'
    : 'text-red-400';

  return (
    <div className="absolute top-1 left-1 z-30">
      {/* Mini indicator — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded bg-black/70 px-2 py-1 text-[10px] font-mono text-green-400 hover:bg-black/80 transition-colors flex items-center gap-1.5"
      >
        <span>
          {props.connectionState === 'connected' ? 'OK' : props.connectionState.slice(0, 4).toUpperCase()}
        </span>
        <ConnectionQuality quality={props.quality} rtt={props.rtt} />
        <span className="text-white/40">|</span>
        <span className="text-white/60">i</span>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="mt-1 w-64 rounded-lg bg-black/85 p-3 text-[10px] font-mono text-green-400 leading-relaxed backdrop-blur-sm border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/60 text-[9px] uppercase tracking-wider">Debug Info</span>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">x</button>
          </div>

          {/* Connection */}
          <div className="space-y-0.5 mb-2">
            <div className="text-white/40">-- Connection --</div>
            <div>ICE: {props.connectionState}</div>
            <div>via: {formatCandidateType(props.candidateType)}</div>
            <div className="flex items-center gap-1">
              quality: <ConnectionQuality quality={props.quality} rtt={props.rtt} />
            </div>
          </div>

          {/* Media */}
          <div className="space-y-0.5 mb-2">
            <div className="text-white/40">-- Media --</div>
            <div>remote: {props.remoteStream ? `${props.remoteStream.getTracks().length} tracks` : 'none'}</div>
            <div>local: {props.localStream ? 'active' : 'none'}</div>
            <div>quality: {props.videoQuality}</div>
          </div>

          {/* Session */}
          <div className="space-y-0.5 mb-2">
            <div className="text-white/40">-- Session --</div>
            <div>ws: {props.wsConnected ? 'connected' : 'disconnected'}</div>
            <div>phase: {props.roomPhase}</div>
            <div>peer: {props.peerName || 'none'}</div>
          </div>

          {/* Server stats */}
          {data && (
            <div className="space-y-0.5 mb-2">
              <div className="text-white/40">-- Server --</div>
              <div>env: {data.env}</div>
              <div>rooms: {data.rooms}</div>
              <div>lobby: {data.lobbyUsers} users</div>
            </div>
          )}

          {/* DeepL usage */}
          {data?.deepl && (
            <div className="space-y-0.5">
              <div className="text-white/40">-- DeepL API --</div>
              <div>
                used: {formatBytes(data.deepl.used)} / {formatBytes(data.deepl.limit)} chars
              </div>
              <div>
                remaining: {formatBytes(data.deepl.remaining)} (
                <span className={deeplColor}>{data.deepl.remainingPct}%</span>)
              </div>
              {/* Bar */}
              <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    deeplPct! > 50 ? 'bg-green-500' : deeplPct! > 20 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${data.deepl.remainingPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
