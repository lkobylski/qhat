const HISTORY_KEY = 'qhat_room_history';
const MAX_ENTRIES = 20;

export interface RoomHistoryEntry {
  code: string;
  myName: string;
  peerName: string;
  myLang: string;
  peerLang: string;
  date: string; // ISO string
  fromLobby: boolean;
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

export function addRoomHistory(entry: Omit<RoomHistoryEntry, 'date'>) {
  const history = getRoomHistory();
  // Don't duplicate same room
  const filtered = history.filter((h) => h.code !== entry.code);
  filtered.unshift({ ...entry, date: new Date().toISOString() });
  // Keep only last N
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_ENTRIES)));
}

export function clearRoomHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
