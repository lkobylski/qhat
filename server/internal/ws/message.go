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
	TypeReaction   = "reaction"
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
	Role              string          `json:"role,omitempty"` // "offerer" or "answerer" in peer_joined
}

// ICEServer holds STUN/TURN server configuration sent to clients.
type ICEServer struct {
	URLs       []string `json:"urls"`
	Username   string   `json:"username,omitempty"`
	Credential string   `json:"credential,omitempty"`
}
