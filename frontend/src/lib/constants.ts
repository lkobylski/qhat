// In dev, Vite proxies /wss → backend /ws to avoid collision with Vite's own HMR websocket on /ws
const wsPath = import.meta.env.DEV ? '/wss' : '/ws';
export const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${wsPath}`;

export const API_URL = import.meta.env.VITE_API_URL || '';

// DeepL supported languages
export const LANGUAGES = [
  { code: 'PL', name: 'Polish' },
  { code: 'EN', name: 'English' },
  { code: 'UK', name: 'Ukrainian' },
  { code: 'ES', name: 'Spanish' },
  { code: 'DE', name: 'German' },
  { code: 'FR', name: 'French' },
  { code: 'LV', name: 'Latvian' },
  { code: 'LT', name: 'Lithuanian' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
