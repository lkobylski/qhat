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
  | 'ice_servers';

export interface InboundMessage {
  type: MessageType;
  roomId?: string;
  name?: string;
  lang?: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  text?: string;
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
