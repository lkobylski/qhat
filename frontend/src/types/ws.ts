export type MessageType =
  | 'join'
  | 'offer'
  | 'answer'
  | 'ice'
  | 'chat'
  | 'peer_joined'
  | 'peer_left'
  | 'room_full'
  | 'error'
  | 'ice_servers'
  | 'typing'
  | 'lang_change'
  | 'reaction'
  | 'media_state'
  | 'lobby_join'
  | 'lobby_leave'
  | 'lobby_users'
  | 'lobby_dm'
  | 'lobby_user_join'
  | 'lobby_user_left'
  | 'lobby_update'
  | 'call_request'
  | 'call_incoming'
  | 'call_accept'
  | 'call_decline'
  | 'call_declined'
  | 'call_start'
  | 'call_cancel'
  | 'call_cancelled';

export interface LobbyUser {
  id: string;
  name: string;
  lang: string;
  status: 'available' | 'in_call' | 'offline';
  lastSeen?: number; // unix timestamp
}

export interface InboundMessage {
  type: MessageType;
  roomId?: string;
  name?: string;
  lang?: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  text?: string;
  targetId?: string;
  callerId?: string;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
}

export interface OutboundMessage {
  type: MessageType;
  name?: string;
  lang?: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  from?: string;
  original?: string;
  translated?: string;
  langFrom?: string;
  langTo?: string;
  ts?: number;
  iceServers?: RTCIceServer[];
  error?: string;
  translationFailed?: boolean;
  role?: 'offerer' | 'answerer';
  users?: LobbyUser[];
  user?: LobbyUser;
  callerId?: string;
  callerName?: string;
  callerLang?: string;
  roomCode?: string;
}

export interface ChatMessage {
  id: string;
  from: string;
  original: string;
  translated: string;
  langFrom: string;
  langTo: string;
  ts: number;
  isMine: boolean;
  translationFailed?: boolean;
}
