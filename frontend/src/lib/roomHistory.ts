import type { ChatMessage } from '../types/ws';

const HISTORY_KEY = 'qhat_room_history';
const CHAT_KEY_PREFIX = 'qhat_chat_';
const MAX_ENTRIES = 20;

export interface RoomHistoryEntry {
  code: string;
  myName: string;
  peerName: string;
  myLang: string;
  peerLang: string;
  date: string; // ISO string
  fromLobby: boolean;
  messageCount: number;
  durationSec: number;
}

export function getRoomHistory(): RoomHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addRoomHistory(entry: Omit<RoomHistoryEntry, 'date' | 'messageCount' | 'durationSec'>) {
  const history = getRoomHistory();
  const existing = history.find((h) => h.code === entry.code);
  const filtered = history.filter((h) => h.code !== entry.code);
  filtered.unshift({
    ...entry,
    date: new Date().toISOString(),
    messageCount: existing?.messageCount || 0,
    durationSec: existing?.durationSec || 0,
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_ENTRIES)));
}

export function updateRoomHistory(code: string, updates: Partial<Pick<RoomHistoryEntry, 'messageCount' | 'durationSec'>>) {
  const history = getRoomHistory();
  const idx = history.findIndex((h) => h.code === code);
  if (idx === -1) return;
  history[idx] = { ...history[idx], ...updates };
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearRoomHistory() {
  // Clear all history entries and their chats
  const history = getRoomHistory();
  for (const entry of history) {
    localStorage.removeItem(CHAT_KEY_PREFIX + entry.code);
  }
  localStorage.removeItem(HISTORY_KEY);
}

export function deleteRoomHistoryEntry(code: string) {
  const history = getRoomHistory().filter((h) => h.code !== code);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  localStorage.removeItem(CHAT_KEY_PREFIX + code);
}

// Chat message persistence
export function saveChatMessages(code: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(CHAT_KEY_PREFIX + code, JSON.stringify(messages));
  } catch {
    // localStorage full — silently fail
  }
}

export function loadChatMessages(code: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY_PREFIX + code);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
