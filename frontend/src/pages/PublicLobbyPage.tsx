import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobby } from '../hooks/useLobby';
import { useCall } from '../hooks/useCall';
import { useMedia } from '../hooks/useMedia';
import { useToast } from '../components/shared/Toast';
import { requestNotificationPermission, showCallNotification } from '../lib/notifications';
import { LanguageSelect } from '../components/shared/LanguageSelect';
import { LANGUAGES } from '../lib/constants';
import { SkeletonUserList } from '../components/shared/Skeleton';
import { CameraPreview } from '../components/lobby/CameraPreview';
import { LobbyUserCard } from '../components/public-lobby/LobbyUserCard';
import { IncomingCallModal } from '../components/public-lobby/IncomingCallModal';
import { CallingOverlay } from '../components/public-lobby/CallingOverlay';

export function PublicLobbyPage() {
  const navigate = useNavigate();
  const lobby = useLobby();
  const call = useCall();
  const media = useMedia();
  const { toast } = useToast();

  const [name, setName] = useState(() => sessionStorage.getItem('lobbyName') || '');
  const [lang, setLang] = useState(() => sessionStorage.getItem('userLang') || 'EN');
  const [callingUserName, setCallingUserName] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editLang, setEditLang] = useState(lang);
  const navigated = useRef(false);
  const prevCallState = useRef(call.callState);

  const handleSaveProfile = () => {
    if (!editName.trim()) return;
    const trimmed = editName.trim();
    setName(trimmed);
    setLang(editLang);
    sessionStorage.setItem('lobbyName', trimmed);
    sessionStorage.setItem('userLang', editLang);
    // Re-join lobby with updated profile
    lobby.joinLobby(trimmed, editLang);
    setShowProfile(false);
  };

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
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditName(name); setEditLang(lang); setShowProfile((v) => !v); }}
                className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                </svg>
                {name}
              </button>
              <button
                onClick={handleLeaveLobby}
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
              >
                Leave
              </button>
            </div>
          )}
        </div>

        {/* Profile settings panel */}
        {showProfile && (
          <div className="shrink-0 border-b border-slate-700 bg-slate-800 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Profile settings</span>
              <button onClick={() => setShowProfile(false)} className="text-slate-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={30}
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Language</label>
              <select
                value={editLang}
                onChange={(e) => setEditLang(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={!editName.trim()}
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
        )}

        {/* Entry form or user list */}
        {!lobby.isInLobby ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 gap-5">
            <CameraPreview
              stream={media.localStream}
              onRequestCamera={media.requestPermissions}
              cameras={media.cameras}
              activeCameraId={media.activeCameraId}
              onCameraChange={media.changeCamera}
              audioEnabled={media.audioEnabled}
              videoEnabled={media.videoEnabled}
              onToggleAudio={media.toggleAudio}
              onToggleVideo={media.toggleVideo}
            />

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
