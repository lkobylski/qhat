import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useCallback, useRef, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { addRoomHistory, saveChatMessages, updateRoomHistory } from '../lib/roomHistory';
import { clearUnread } from '../lib/titleBadge';
import { useMedia } from '../hooks/useMedia';
import { useWebRTC } from '../hooks/useWebRTC';
import { useRoom } from '../hooks/useRoom';
import { useChat } from '../hooks/useChat';
import { LobbyForm } from '../components/lobby/LobbyForm';
import { CameraPreview } from '../components/lobby/CameraPreview';
import { WaitingScreen } from '../components/lobby/WaitingScreen';
import { VideoPanel } from '../components/room/VideoPanel';
import { MediaControls } from '../components/room/MediaControls';
import { ChatPanel } from '../components/room/ChatPanel';
import { ChatInput } from '../components/chat/ChatInput';
import { ErrorBanner } from '../components/shared/ErrorBanner';
import { Reactions } from '../components/room/Reactions';
import { LanguageChanger } from '../components/room/LanguageChanger';
import { DebugPanel } from '../components/room/DebugPanel';

export function RoomPage() {
  const params = useParams<{ id?: string; code?: string }>();
  const roomId = params.code || params.id || '';
  const navigate = useNavigate();
  const location = useLocation();
  const stateFromLobby = (location.state as { fromLobby?: boolean })?.fromLobby;
  const lobbyName = (location.state as { name?: string })?.name;
  const lobbyLang = (location.state as { lang?: string })?.lang;

  // Persist fromLobby flag so both sides know to return to lobby.
  // Only valid when we have actual lobby state (name + lang).
  if (stateFromLobby && lobbyName) {
    sessionStorage.setItem('fromLobby', '1');
    sessionStorage.setItem('fromLobbyName', lobbyName);
    sessionStorage.setItem('fromLobbyLang', lobbyLang || 'EN');
  }
  const savedLobbyName = lobbyName || sessionStorage.getItem('fromLobbyName') || '';
  const savedLobbyLang = lobbyLang || sessionStorage.getItem('fromLobbyLang') || 'EN';
  const fromLobby = (stateFromLobby || sessionStorage.getItem('fromLobby') === '1') && !!savedLobbyName;

  const { connected, connect, send } = useWebSocket();
  const media = useMedia();
  const webrtc = useWebRTC({ send, localStream: media.localStream });
  const room = useRoom({
    roomId: roomId || '',
    send,
    startOffer: webrtc.startOffer,
    connectionState: webrtc.connectionState,
  });
  const [activeLang, setActiveLang] = useState(room.myLang);
  const chat = useChat({ myName: room.myName, myLang: activeLang, send });

  const handleJoin = useCallback(
    async (name: string, lang: string) => {
      if (!media.localStream) {
        await media.requestPermissions();
      }
      setActiveLang(lang);
      connect();
      room.setJoinPending({ name, lang });
    },
    [media, connect, room]
  );

  // Auto-join from lobby (call accepted) or auto-rejoin on refresh
  const autoRejoinTriggered = useRef(false);
  useEffect(() => {
    if (autoRejoinTriggered.current) return;

    // From lobby: auto-join immediately (WS already connected)
    if (fromLobby && savedLobbyName && room.phase === 'lobby') {
      autoRejoinTriggered.current = true;
      setActiveLang(savedLobbyLang);
      media.requestPermissions().then(() => {
        room.joinRoom(savedLobbyName, savedLobbyLang);
      });
      return;
    }

    // From refresh: saved session triggers rejoin
    if (room.joinPending && room.phase === 'lobby') {
      autoRejoinTriggered.current = true;
      setActiveLang(room.joinPending.lang);
      media.requestPermissions().then(() => {
        connect();
      });
    }
  }, [room.joinPending, room.phase, media, connect, fromLobby, lobbyName, lobbyLang, room]);

  useEffect(() => {
    if (connected && room.joinPending) {
      room.joinRoom(room.joinPending.name, room.joinPending.lang);
    }
  }, [connected, room]);

  // Save to room history when peer connects + track start time
  const callStartRef = useRef<number>(0);
  useEffect(() => {
    if (room.phase === 'connecting' && room.peer && room.myName) {
      callStartRef.current = Date.now();
      addRoomHistory({
        code: roomId,
        myName: room.myName,
        peerName: room.peer.name,
        myLang: activeLang,
        peerLang: room.peer.lang,
        fromLobby: !!fromLobby,
      });
    }
  }, [room.phase, room.peer, room.myName, roomId, activeLang, fromLobby]);

  // Save chat messages to localStorage whenever they change
  useEffect(() => {
    if (chat.messages.length > 0) {
      saveChatMessages(roomId, chat.messages);
      updateRoomHistory(roomId, { messageCount: chat.messages.length });
    }
  }, [chat.messages, roomId]);

  // Update duration and stop media when call ends
  useEffect(() => {
    if (room.phase === 'ended') {
      media.stopMedia();
      if (callStartRef.current > 0) {
        const duration = Math.floor((Date.now() - callStartRef.current) / 1000);
        updateRoomHistory(roomId, { durationSec: duration });
        callStartRef.current = 0;
      }
    }
  }, [room.phase, roomId]);

  // Clear title badge on mount
  useEffect(() => {
    clearUnread();
  }, []);

  useEffect(() => {
    if (room.phase === 'ended') {
      clearUnread();
      navigate(fromLobby ? '/lobby' : '/ended');
    }
  }, [room.phase, navigate, fromLobby]);

  if (!roomId) {
    return <div className="p-8 text-center text-red-600">Invalid room link</div>;
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-800">
      <div className="relative flex h-[90vh] w-[min(95vw,900px)] flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">

        {/* Error banners */}
        {room.errorMessage && (
          <div className="absolute top-0 left-0 right-0 z-30">
            <ErrorBanner message={room.errorMessage} />
          </div>
        )}
        {media.error && (
          <div className="absolute top-0 left-0 right-0 z-30">
            <ErrorBanner message={media.error} />
          </div>
        )}

        {/* Lobby, reconnecting, or auto-joining from lobby call */}
        {room.phase === 'lobby' && (
          <div className="flex flex-1 flex-col items-center justify-center px-4 gap-6">
            {room.reconnecting || fromLobby ? (
              <div className="text-center text-white">
                <div className="mb-2 text-lg font-medium animate-pulse">
                  {fromLobby ? 'Connecting...' : 'Reconnecting...'}
                </div>
                <div className="text-sm text-white/60">
                  {fromLobby ? `Joining as ${savedLobbyName}` : `Rejoining as ${room.joinPending?.name}`}
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate('/')}
                  className="self-start text-xs text-slate-400 hover:text-white transition-colors"
                >
                  &larr; Back to home
                </button>
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
                <LobbyForm onJoin={handleJoin} />
              </>
            )}
          </div>
        )}

        {/* Waiting */}
        {room.phase === 'waiting' && (
          <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-6">
            <WaitingScreen roomId={roomId} onBack={() => navigate('/')} />
          </div>
        )}

        {/* Active call */}
        {(room.phase === 'connecting' || room.phase === 'connected') && (
          <>
            <div className="relative flex-1 min-h-0 bg-black">
              <DebugPanel
                connectionState={webrtc.connectionState}
                candidateType={webrtc.candidateType}
                quality={webrtc.quality}
                rtt={webrtc.rtt}
                remoteStream={webrtc.remoteStream}
                localStream={media.localStream}
                wsConnected={connected}
                roomPhase={room.phase}
                peerName={room.peer?.name || ''}
                videoQuality={media.quality}
              />

              {/* Language changer — top right */}
              <LanguageChanger
                myLang={activeLang}
                peerLang={room.peer?.lang || ''}
                send={send}
                onLangChange={setActiveLang}
              />

              <VideoPanel
                remoteStream={webrtc.remoteStream}
                localStream={media.localStream}
                peerName={room.peer?.name || ''}
              />

              {/* Emoji reactions */}
              <Reactions send={send} />

              {/* Chat overlay */}
              <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
                <div className="pointer-events-auto">
                  <ChatPanel
                    messages={chat.messages}
                    peerTyping={chat.peerTyping}
                    peerName={room.peer?.name || ''}
                  />
                </div>
              </div>
            </div>

            <MediaControls
              videoEnabled={media.videoEnabled}
              audioEnabled={media.audioEnabled}
              onToggleVideo={media.toggleVideo}
              onToggleAudio={media.toggleAudio}
              onLeave={room.leaveRoom}
              hasMedia={!!media.localStream}
              roomId={roomId}
              videoQuality={media.quality}
              onQualityChange={media.changeQuality}
              cameras={media.cameras}
              activeCameraId={media.activeCameraId}
              onCameraChange={media.changeCamera}
            />

            <ChatInput onSend={chat.sendMessage} onTyping={chat.sendTyping} />
          </>
        )}

        {/* Error */}
        {room.phase === 'error' && (
          <div className="flex flex-1 items-center justify-center px-4">
            <div className="text-center">
              <p className="text-lg font-medium text-red-400">{room.errorMessage}</p>
              <button
                onClick={() => navigate('/')}
                className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
              >
                Back to home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
