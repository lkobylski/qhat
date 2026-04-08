import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useMedia } from '../hooks/useMedia';
import { useWebRTC } from '../hooks/useWebRTC';
import { useRoom } from '../hooks/useRoom';
import { useChat } from '../hooks/useChat';
import { LobbyForm } from '../components/lobby/LobbyForm';
import { WaitingScreen } from '../components/lobby/WaitingScreen';
import { VideoPanel } from '../components/room/VideoPanel';
import { MediaControls } from '../components/room/MediaControls';
import { ChatPanel } from '../components/room/ChatPanel';
import { ChatInput } from '../components/chat/ChatInput';
import { ErrorBanner } from '../components/shared/ErrorBanner';

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
  const chat = useChat({ myName: room.myName, myLang: room.myLang, send });

  const handleJoin = useCallback(
    async (name: string, lang: string) => {
      await media.requestPermissions();
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
      media.requestPermissions().then(() => {
        connect();
      });
    }
  }, [room.joinPending, room.phase, media, connect]);

  // Send join message once WS is connected and join is pending
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
      {/* App container — centered, not fullscreen */}
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
          <div className="flex flex-1 items-center justify-center px-4">
            {room.joinPending ? (
              <div className="text-center text-white">
                <div className="mb-2 text-lg font-medium animate-pulse">Reconnecting...</div>
                <div className="text-sm text-white/60">Rejoining as {room.joinPending.name}</div>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-center text-xl font-semibold text-white">
                  Join the conversation
                </h2>
                <LobbyForm onJoin={handleJoin} />
              </div>
            )}
          </div>
        )}

        {/* Waiting */}
        {room.phase === 'waiting' && (
          <div className="flex flex-1 items-center justify-center px-4">
            <WaitingScreen roomId={roomId} />
          </div>
        )}

        {/* Active call */}
        {(room.phase === 'connecting' || room.phase === 'connected') && (
          <>
            {/* Video area */}
            <div className="relative flex-1 min-h-0 bg-black">
              {/* Debug overlay — remove after testing */}
              <div className="absolute top-1 left-1 z-30 rounded bg-black/70 px-2 py-1 text-[10px] text-green-400 font-mono">
                ICE: {webrtc.connectionState} | video: {webrtc.remoteStream ? 'yes' : 'no'} | media: {media.localStream ? 'yes' : 'no'}
              </div>
              <VideoPanel
                remoteStream={webrtc.remoteStream}
                localStream={media.localStream}
                peerName={room.peer?.name || ''}
              />

              {/* Chat overlay on bottom-left of video */}
              <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
                <div className="pointer-events-auto">
                  <ChatPanel messages={chat.messages} />
                </div>
              </div>
            </div>

            {/* Controls bar below video */}
            <MediaControls
              videoEnabled={media.videoEnabled}
              audioEnabled={media.audioEnabled}
              onToggleVideo={media.toggleVideo}
              onToggleAudio={media.toggleAudio}
              onLeave={room.leaveRoom}
              hasMedia={!!media.localStream}
            />

            {/* Chat input at the very bottom */}
            <ChatInput onSend={chat.sendMessage} />
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
