const audioCache = new Map<string, HTMLAudioElement>();

function getAudio(src: string): HTMLAudioElement {
  let audio = audioCache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audioCache.set(src, audio);
  }
  return audio;
}

export function playRingtone(): { stop: () => void } {
  const audio = getAudio('/sounds/ringtone.wav');
  audio.loop = true;
  audio.volume = 0.5;
  audio.currentTime = 0;
  audio.play().catch(() => {});
  return {
    stop: () => {
      audio.pause();
      audio.currentTime = 0;
    },
  };
}

export function playMessageSound() {
  const audio = getAudio('/sounds/message.wav');
  audio.volume = 0.4;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
