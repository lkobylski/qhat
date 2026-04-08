import { useState } from 'react';

interface WaitingScreenProps {
  roomId: string;
}

export function WaitingScreen({ roomId }: WaitingScreenProps) {
  const roomCode = roomId.slice(0, 6);
  const roomUrl = `${window.location.origin}/room/${roomId}`;
  const [copied, setCopied] = useState(false);

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

  return (
    <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>
      <p style={{ fontSize: '18px', marginBottom: '20px' }}>Waiting for someone to join...</p>

      <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>ROOM CODE</p>
      <p style={{ fontSize: '32px', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '0.2em', marginBottom: '24px' }}>
        {roomCode}
      </p>

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
    </div>
  );
}
