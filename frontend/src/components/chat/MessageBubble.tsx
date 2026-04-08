import type { ChatMessage } from '../../types/ws';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const showTranslation =
    message.translated &&
    message.translated !== message.original &&
    !message.translationFailed;

  // Both sender and receiver always on the left
  // Sender name: magenta, receiver name: blue
  const nameColor = message.isMine ? 'text-fuchsia-400' : 'text-blue-400';

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur-sm">
        <span className={`text-xs font-semibold ${nameColor}`}>{message.from}: </span>
        {showTranslation ? (
          <>
            {/* Translated text prominent on top */}
            <span className="text-sm text-white">{message.translated}</span>
            {/* Original text small below */}
            <div className="text-[11px] leading-tight text-white/40 italic">{message.original}</div>
          </>
        ) : (
          <span className="text-sm text-white">{message.original}</span>
        )}
        {message.translationFailed && (
          <div className="text-[11px] text-amber-300 italic">Translation unavailable</div>
        )}
      </div>
    </div>
  );
}
