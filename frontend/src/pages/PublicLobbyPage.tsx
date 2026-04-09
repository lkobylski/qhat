import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobby } from '../hooks/useLobby';
import { useCall } from '../hooks/useCall';
import { useToast } from '../components/shared/Toast';
import { requestNotificationPermission, showCallNotification } from '../lib/notifications';
import { LanguageSelect } from '../components/shared/LanguageSelect';
import { SkeletonUserList } from '../components/shared/Skeleton';
import { LobbyUserCard } from '../components/public-lobby/LobbyUserCard';
import { IncomingCallModal } from '../components/public-lobby/IncomingCallModal';
import { CallingOverlay } from '../components/public-lobby/CallingOverlay';

export function PublicLobbyPage() {
  const navigate = useNavigate();
  const lobby = useLobby();
  const call = useCall();
  const { toast } = useToast();

  const [name, setName] = useState(() => sessionStorage.getItem('lobbyName') || '');
  const [lang, setLang] = useState(() => sessionStorage.getItem('userLang') || 'EN');
  const [callingUserName, setCallingUserName] = useState('');
  const navigated = useRef(false);
  const prevCallState = useRef(call.callState);

  const handleJoinLobby = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    sessionStorage.setItem('lobbyName', name.trim());
    sessionStorage.setItem('userLang', lang);
    lobby.joinLobby(name.trim(), lang);
    requestNotificationPermission();
  };

  const handleCall = (targetId: string) => {
    const target = lobby.users.find((u) => u.id === targetId);
    setCallingUserName(target?.name || 'User');
    call.callUser(targetId);
  };

  const handleLeaveLobby = () => {
    lobby.leaveLobby();
    sessionStorage.removeItem('fromLobby');
    navigate('/');
  };

  // Toast notifications for call state changes
  useEffect(() => {
    const prev = prevCallState.current;
    const curr = call.callState;
    prevCallState.current = curr;

    if (prev === 'calling' && curr === 'idle') {
      toast('Call declined', 'error');
    }
    if (prev === 'incoming' && curr === 'idle') {
      toast('Call cancelled', 'info');
    }
  }, [call.callState, toast]);

  // Show push notification for incoming call when tab is in background
  const notificationRef = useRef<Notification | null>(null);
  useEffect(() => {
    if (call.callState === 'incoming' && call.incomingCaller) {
      notificationRef.current = showCallNotification(call.incomingCaller.name);
    } else {
      notificationRef.current?.close();
      notificationRef.current = null;
    }
  }, [call.callState, call.incomingCaller]);

  // Navigate to room when call is accepted
  useEffect(() => {
    if (call.callState === 'accepted' && call.targetRoomCode && !navigated.current) {
      navigated.current = true;
      navigate(`/c/${call.targetRoomCode}`, {
        state: { fromLobby: true, name: name.trim(), lang },
      });
    }
  }, [call.callState, call.targetRoomCode, navigate, name, lang]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-800">
      <div className="relative flex h-[90vh] w-[min(95vw,500px)] flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h1 className="text-lg font-semibold text-white">Public Lobby</h1>
          {lobby.isInLobby && (
            <button
              onClick={handleLeaveLobby}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
            >
              Leave
            </button>
          )}
        </div>

        {/* Entry form or user list */}
        {!lobby.isInLobby ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 gap-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-600 shadow-lg shadow-green-600/30">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-white">
                  <path d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z" />
                  <path d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Join the lobby</h2>
              <p className="mt-1 text-sm text-slate-400">See who's online and start chatting</p>
            </div>

            <form onSubmit={handleJoinLobby} className="w-full max-w-xs space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={30}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Your language</label>
                <LanguageSelect value={lang} onChange={setLang} className="w-full" />
              </div>
              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full rounded-xl bg-green-600 px-4 py-3.5 text-base font-semibold text-white shadow-md hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                Enter lobby
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {lobby.loading ? (
              <SkeletonUserList count={3} />
            ) : lobby.users.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-3 text-4xl">👀</div>
                <p className="text-slate-400">No one else is here yet</p>
                <p className="mt-1 text-xs text-slate-500">Wait for someone to join...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 px-1">
                  {lobby.users.length} user{lobby.users.length !== 1 ? 's' : ''} online
                </p>
                {lobby.users.map((user) => (
                  <LobbyUserCard
                    key={user.id}
                    user={user}
                    onCall={handleCall}
                    disabled={call.callState !== 'idle'}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Call overlays */}
        {call.callState === 'incoming' && call.incomingCaller && (
          <IncomingCallModal
            callerName={call.incomingCaller.name}
            callerLang={call.incomingCaller.lang}
            onAccept={call.acceptCall}
            onDecline={call.declineCall}
          />
        )}

        {call.callState === 'calling' && (
          <CallingOverlay
            targetName={callingUserName}
            onCancel={call.cancelCall}
          />
        )}
      </div>
    </div>
  );
}
