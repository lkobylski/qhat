package ws

import "encoding/json"

// WebSocket message type constants.
const (
	TypeJoin       = "join"
	TypeOffer      = "offer"
	TypeAnswer     = "answer"
	TypeICE        = "ice"
	TypeChat       = "chat"
	TypePeerJoined = "peer_joined"
	TypePeerLeft   = "peer_left"
	TypeRoomFull   = "room_full"
	TypeError      = "error"
	TypeICEServers = "ice_servers"
	TypeTyping     = "typing"
	TypeLangChange = "lang_change"
	TypeReaction    = "reaction"
	TypeMediaState = "media_state"

	// Lobby message types
	TypeLobbyJoin     = "lobby_join"
	TypeLobbyLeave    = "lobby_leave"
	TypeLobbyUsers    = "lobby_users"
	TypeLobbyUserJoin = "lobby_user_join"
	TypeLobbyUserLeft = "lobby_user_left"
	TypeLobbyUpdate   = "lobby_update"

	// Lobby direct message
	TypeLobbyDM = "lobby_dm"

	// Call flow message types
	TypeCallRequest   = "call_request"
	TypeCallIncoming  = "call_incoming"
	TypeCallAccept    = "call_accept"
	TypeCallDecline   = "call_decline"
	TypeCallDeclined  = "call_declined"
	TypeCallStart     = "call_start"
	TypeCallCancel    = "call_cancel"
	TypeCallCancelled = "call_cancelled"
)

// InboundMessage represents a message received from a client.
type InboundMessage struct {
	Type      string          `json:"type"`
	RoomID    string          `json:"roomId,omitempty"`
	Name      string          `json:"name,omitempty"`
	Lang      string          `json:"lang,omitempty"`
	SDP       string          `json:"sdp,omitempty"`
	Candidate json.RawMessage `json:"candidate,omitempty"`
	Text      string          `json:"text,omitempty"`
	TargetID  string          `json:"targetId,omitempty"` // for call_request
	CallerID  string          `json:"callerId,omitempty"` // for call_accept/decline
}

// OutboundMessage represents a message sent to a client.
type OutboundMessage struct {
	Type              string          `json:"type"`
	Name              string          `json:"name,omitempty"`
	Lang              string          `json:"lang,omitempty"`
	SDP               string          `json:"sdp,omitempty"`
	Candidate         json.RawMessage `json:"candidate,omitempty"`
	From              string          `json:"from,omitempty"`
	Original          string          `json:"original,omitempty"`
	Translated        string          `json:"translated,omitempty"`
	LangFrom          string          `json:"langFrom,omitempty"`
	LangTo            string          `json:"langTo,omitempty"`
	Timestamp         int64           `json:"ts,omitempty"`
	ICEServers        []ICEServer     `json:"iceServers,omitempty"`
	Error             string          `json:"error,omitempty"`
	TranslationFailed bool            `json:"translationFailed,omitempty"`
	Role              string          `json:"role,omitempty"`     // "offerer" or "answerer"
	Users             []LobbyUserDTO  `json:"users,omitempty"`   // for lobby_users
	User              *LobbyUserDTO   `json:"user,omitempty"`    // for lobby_user_join/left/update
	CallerID          string          `json:"callerId,omitempty"`
	CallerName        string          `json:"callerName,omitempty"`
	CallerLang        string          `json:"callerLang,omitempty"`
	RoomCode          string          `json:"roomCode,omitempty"` // for call_start
}

// LobbyUserDTO is the client-facing representation of a lobby user.
type LobbyUserDTO struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Lang     string `json:"lang"`
	Status   string `json:"status"`             // "available", "in_call", or "offline"
	LastSeen int64  `json:"lastSeen,omitempty"` // unix timestamp, set when offline
}

// ICEServer holds STUN/TURN server configuration sent to clients.
type ICEServer struct {
	URLs       []string `json:"urls"`
	Username   string   `json:"username,omitempty"`
	Credential string   `json:"credential,omitempty"`
}
