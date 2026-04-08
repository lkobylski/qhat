import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useCallback, useRef, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
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
import { ConnectionQuality } from '../components/room/ConnectionQuality';

export function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();

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

  // Auto-rejoin on refresh if we have a saved session
  const autoRejoinTriggered = useRef(false);
  useEffect(() => {
    if (room.joinPending && room.phase === 'lobby' && !autoRejoinTriggered.current) {
      autoRejoinTriggered.current = true;
      setActiveLang(room.joinPending.lang);
      media.requestPermissions().then(() => {
        connect();
      });
    }
  }, [room.joinPending, room.phase, media, connect]);

  useEffect(() => {
    if (connected && room.joinPending) {
      room.joinRoom(room.joinPending.name, room.joinPending.lang);
    }
  }, [connected, room]);

  useEffect(() => {
    if (room.phase === 'ended') {
      navigate('/ended');
    }
  }, [room.phase, navigate]);

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

        {/* Lobby or reconnecting */}
        {room.phase === 'lobby' && (
          <div className="flex flex-1 flex-col items-center justify-center px-4 gap-6">
            {room.reconnecting ? (
              <div className="text-center text-white">
                <div className="mb-2 text-lg font-medium animate-pulse">Reconnecting...</div>
                <div className="text-sm text-white/60">Rejoining as {room.joinPending?.name}</div>
              </div>
            ) : (
              <>
                <CameraPreview
                  stream={media.localStream}
                  onRequestCamera={media.requestPermissions}
                />
                <LobbyForm onJoin={handleJoin} />
              </>
            )}
          </div>
        )}

        {/* Waiting */}
        {room.phase === 'waiting' && (
          <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-6">
            <WaitingScreen roomId={roomId} />
          </div>
        )}

        {/* Active call */}
        {(room.phase === 'connecting' || room.phase === 'connected') && (
          <>
            <div className="relative flex-1 min-h-0 bg-black">
              {/* Debug overlay + connection quality */}
              <div className="absolute top-1 left-1 z-30 flex items-start gap-2">
                <div className="rounded bg-black/70 px-2 py-1 text-[10px] text-green-400 font-mono leading-relaxed">
                  <div className="flex items-center gap-2">
                    <span>ICE: {webrtc.connectionState}{webrtc.candidateType ? ` (${webrtc.candidateType})` : ''}</span>
                    <ConnectionQuality quality={webrtc.quality} rtt={webrtc.rtt} />
                  </div>
                  <div>remote: {webrtc.remoteStream ? `${webrtc.remoteStream.getTracks().length} tracks` : 'none'} | local: {media.localStream ? 'ok' : 'none'}</div>
                  <div>ws: {connected ? 'ok' : 'off'} | phase: {room.phase} | peer: {room.peer?.name || 'none'}</div>
                </div>
              </div>

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
