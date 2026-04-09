import { useState } from 'react';

interface WaitingScreenProps {
  roomId: string;
  onBack?: () => void;
}

export function WaitingScreen({ roomId, onBack }: WaitingScreenProps) {
  const roomCode = roomId;
  const roomUrl = `${window.location.origin}/c/${roomId}`;
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'qhat', text: `Join my video chat! Code: ${roomCode}`, url: roomUrl });
        return;
      } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>
      <p style={{ fontSize: '18px', marginBottom: '20px' }}>Waiting for someone to join...</p>

      <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>ROOM CODE</p>
      <button
        onClick={handleCopyCode}
        title="Click to copy code"
        className="group relative mb-6 cursor-pointer rounded-xl bg-slate-800 px-6 py-3 transition-colors hover:bg-slate-700"
      >
        <span className="font-mono text-3xl font-bold tracking-widest text-white">
          {roomCode}
        </span>
        <span className="absolute -top-2 -right-2 rounded-full bg-slate-600 px-2 py-0.5 text-[10px] text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
          {codeCopied ? 'Copied!' : 'Copy'}
        </span>
      </button>

      <button
        onClick={handleShare}
        style={{
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '12px 32px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '16px',
          width: '100%',
        }}
      >
        {copied ? 'Link copied!' : 'Share invite link'}
      </button>

      <p style={{ fontSize: '11px', color: '#64748b', wordBreak: 'break-all' }}>
        {roomUrl}
      </p>

      {onBack && (
        <button
          onClick={onBack}
          style={{
            marginTop: '16px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          &larr; Back to home
        </button>
      )}
    </div>
  );
}
