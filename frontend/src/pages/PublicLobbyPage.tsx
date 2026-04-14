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
import { LobbyChat } from '../components/public-lobby/LobbyChat';

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
  const [preCall, setPreCall] = useState(false);
  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const navigated = useRef(false);
  const prevCallState = useRef(call.callState);

  const handleSaveProfile = () => {
    if (!editName.trim()) return;
    const trimmed = editName.trim();
    setName(trimmed);
    setLang(editLang);
    sessionStorage.setItem('lobbyName', trimmed);
    sessionStorage.setItem('userLang', editLang);
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
    media.stopMedia();
    sessionStorage.removeItem('fromLobby');
    navigate('/');
  };

  const handleJoinCall = () => {
    if (!call.targetRoomCode || navigated.current) return;
    navigated.current = true;
    navigate(`/c/${call.targetRoomCode}`, {
      state: { fromLobby: true, name: name.trim(), lang },
    });
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

  // When call is accepted, show pre-call screen and request camera
  useEffect(() => {
    if (call.callState === 'accepted' && call.targetRoomCode && !navigated.current) {
      setPreCall(true);
      media.requestPermissions();
    }
  }, [call.callState, call.targetRoomCode]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-800">
      <div className="relative flex h-[90vh] w-[min(95vw,500px)] flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h1 className="text-lg font-semibold text-white">Public Lobby</h1>
          {lobby.isInLobby && !preCall && (
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
        {showProfile && !preCall && (
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

        {/* Pre-call screen: camera preview + join button */}
        {preCall ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 gap-5">
            <p className="text-sm text-slate-400">Check your camera and mic before joining</p>
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
            <button
              onClick={handleJoinCall}
              className="w-full max-w-xs rounded-xl bg-green-600 px-4 py-3.5 text-base font-semibold text-white shadow-md hover:bg-green-500 transition-colors"
            >
              Join call
            </button>
          </div>
        ) : (
          <>
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
            ) : chatUserId && lobby.users.find((u) => u.id === chatUserId) ? (
              <LobbyChat
                user={lobby.users.find((u) => u.id === chatUserId)!}
                myId={lobby.myId}
                myName={name}
                messages={lobby.dmMessages[chatUserId] || []}
                onAddMessage={(msg) => lobby.addDmMessage(chatUserId, msg)}
                onUpdateMessage={(original, updates) => lobby.updateLastDm(chatUserId, original, updates)}
                onClose={() => { setChatUserId(null); lobby.setOpenChat(null); }}
                onCall={() => {
                  setChatUserId(null);
                  handleCall(chatUserId);
                }}
              />
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {/* Missed calls */}
                {call.missedCalls.length > 0 && (
                  <div className="mb-3 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-red-400">
                        Missed calls ({call.missedCalls.length})
                      </span>
                      <button
                        onClick={call.clearMissedCalls}
                        className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    {call.missedCalls.map((mc) => (
                      <div key={mc.id} className="flex items-center gap-2 py-1">
                        <span className="text-xs text-red-300">{mc.name}</span>
                        <span className="text-[10px] text-red-400/50">{mc.lang}</span>
                        <span className="ml-auto text-[10px] text-red-400/40">{mc.time}</span>
                      </div>
                    ))}
                  </div>
                )}
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
                    {(() => {
                      const online = lobby.users.filter((u) => u.status !== 'offline');
                      const offline = lobby.users.filter((u) => u.status === 'offline');
                      return (
                        <>
                          <p className="text-xs text-slate-500 px-1">
                            {online.length} online{offline.length > 0 ? `, ${offline.length} recently seen` : ''}
                          </p>
                          {online.map((user) => (
                            <LobbyUserCard
                              key={user.id}
                              user={user}
                              onCall={handleCall}
                              onClick={(id) => { setChatUserId(id); lobby.setOpenChat(id); }}
                              disabled={call.callState !== 'idle'}
                              unreadCount={lobby.unreadDMs[user.id]}
                            />
                          ))}
                          {offline.length > 0 && online.length > 0 && (
                            <div className="flex items-center gap-2 px-1 pt-2">
                              <div className="flex-1 border-t border-slate-700/50" />
                              <span className="text-[10px] text-slate-600">Recently seen</span>
                              <div className="flex-1 border-t border-slate-700/50" />
                            </div>
                          )}
                          {offline.map((user) => (
                            <LobbyUserCard
                              key={user.id}
                              user={user}
                              onCall={handleCall}
                              onClick={(id) => { setChatUserId(id); lobby.setOpenChat(id); }}
                              disabled={true}
                              unreadCount={lobby.unreadDMs[user.id]}
                            />
                          ))}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Call overlays */}
        {!preCall && call.callState === 'incoming' && call.incomingCaller && (
          <IncomingCallModal
            callerName={call.incomingCaller.name}
            callerLang={call.incomingCaller.lang}
            onAccept={call.acceptCall}
            onDecline={call.declineCall}
          />
        )}

        {!preCall && call.callState === 'calling' && (
          <CallingOverlay
            targetName={callingUserName}
            onCancel={call.cancelCall}
          />
        )}
      </div>
    </div>
  );
}
