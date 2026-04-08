import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../lib/constants';

export function LandingPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleCreate = () => {
    const roomId = crypto.randomUUID();
    navigate(`/room/${roomId}`);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/room/code/${code.trim()}`);
      if (!res.ok) {
        setJoinError('Room not found. Check the code and try again.');
        return;
      }
      const data = await res.json();
      navigate(`/room/${data.roomId}`);
    } catch {
      setJoinError('Could not connect to server.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">qhat</h1>
          <p className="mt-2 text-gray-600">
            Video chat with live translation. No account needed.
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-medium text-white hover:bg-blue-700 transition-colors shadow-md"
        >
          Start a conversation
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-gray-300" />
          <span className="text-sm text-gray-500">or join with a code</span>
          <div className="flex-1 border-t border-gray-300" />
        </div>

        <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setJoinError('');
            }}
            placeholder="Enter room code"
            maxLength={6}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-lg tracking-widest focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!code.trim()}
            className="rounded-lg bg-gray-800 px-6 py-3 text-lg font-medium text-white hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Join
          </button>
        </form>

        {joinError && <p className="text-sm text-red-600">{joinError}</p>}
      </div>
    </div>
  );
}
