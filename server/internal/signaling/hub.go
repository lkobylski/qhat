package signaling

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/lkobylski/qhat/server/internal/chat"
	"github.com/lkobylski/qhat/server/internal/config"
	"github.com/lkobylski/qhat/server/internal/lobby"
	"github.com/lkobylski/qhat/server/internal/ratelimit"
	"github.com/lkobylski/qhat/server/internal/room"
	"github.com/lkobylski/qhat/server/internal/ws"
)

// Hub routes WebSocket messages between clients in rooms.
type Hub struct {
	rooms       *room.Manager
	config      *config.Config
	chatProc    *chat.Processor
	rateLimiter *ratelimit.Limiter
	lobby       *lobby.Manager

	mu           sync.RWMutex
	clients      map[string]*ws.Client // client ID → *ws.Client
	clientRooms  map[string]string     // client ID → room ID
	lobbyClients map[string]bool       // client ID → in lobby
	pendingCalls map[string]string     // caller ID → target ID
}

// NewHub creates a signaling hub.
func NewHub(rooms *room.Manager, cfg *config.Config, chatProc *chat.Processor, rl *ratelimit.Limiter, lob *lobby.Manager) *Hub {
	return &Hub{
		rooms:        rooms,
		config:       cfg,
		chatProc:     chatProc,
		rateLimiter:  rl,
		lobby:        lob,
		clients:      make(map[string]*ws.Client),
		clientRooms:  make(map[string]string),
		lobbyClients: make(map[string]bool),
		pendingCalls: make(map[string]string),
	}
}

// Register adds a client to the hub's registry.
func (h *Hub) Register(client *ws.Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client.ID] = client
}

// Dispatch routes an inbound message to the appropriate handler.
func (h *Hub) Dispatch(client *ws.Client, raw []byte) {
	// Ignore non-JSON messages (e.g., heartbeat "ping" from frontend)
	if len(raw) == 0 || raw[0] != '{' {
		return
	}

	var msg ws.InboundMessage
	if err := json.Unmarshal(raw, &msg); err != nil {
		log.Printf("invalid message from %s: %v", client.ID, err)
		return
	}

	switch msg.Type {
	case ws.TypeJoin:
		h.handleJoin(client, &msg)
	case ws.TypeOffer:
		log.Printf("[signal] offer from %s (room %s)", client.ID, client.RoomID)
		h.relayToPeer(client, raw)
	case ws.TypeAnswer:
		log.Printf("[signal] answer from %s (room %s)", client.ID, client.RoomID)
		h.relayToPeer(client, raw)
	case ws.TypeICE:
		h.relayToPeer(client, raw)
	case ws.TypeChat:
		h.handleChat(client, &msg)
	case ws.TypeTyping:
		h.relayToPeer(client, raw)
	case ws.TypeReaction:
		h.relayToPeer(client, raw)
	case ws.TypeMediaState:
		h.relayToPeer(client, raw)
	case ws.TypeLangChange:
		h.handleLangChange(client, &msg)
	case ws.TypeLobbyJoin:
		h.handleLobbyJoin(client, &msg)
	case ws.TypeLobbyLeave:
		h.handleLobbyLeave(client)
	case ws.TypeLobbyDM:
		h.handleLobbyDM(client, &msg)
	case ws.TypeCallRequest:
		h.handleCallRequest(client, &msg)
	case ws.TypeCallAccept:
		h.handleCallAccept(client, &msg)
	case ws.TypeCallDecline:
		h.handleCallDecline(client, &msg)
	case ws.TypeCallCancel:
		h.handleCallCancel(client)
	default:
		client.Send(&ws.OutboundMessage{Type: ws.TypeError, Error: fmt.Sprintf("unknown message type: %s", msg.Type)})
	}
}

const reconnectGrace = 20 * time.Second

// HandleDisconnect is called when a client's WebSocket connection closes.
// Instead of removing immediately, marks participant as disconnected with a grace period.
func (h *Hub) HandleDisconnect(client *ws.Client) {
	// Handle lobby disconnect
	h.handleLobbyDisconnect(client.ID)

	h.mu.Lock()
	delete(h.clients, client.ID)
	roomID, ok := h.clientRooms[client.ID]
	delete(h.clientRooms, client.ID)
	h.mu.Unlock()

	if !ok {
		return
	}

	r := h.rooms.Get(roomID)
	if r == nil {
		return
	}

	// Mark as disconnected instead of removing
	r.MarkDisconnected(client.ID)
	log.Printf("client %s disconnected from room %s (grace period %s)", client.ID, roomID, reconnectGrace)

	// Notify the remaining peer that connection is temporarily lost
	peerClient := h.findPeerClient(r, client.ID)
	if peerClient != nil {
		peerClient.Send(&ws.OutboundMessage{Type: ws.TypePeerLeft})
	}

	// Schedule cleanup after grace period
	go func() {
		time.Sleep(reconnectGrace)
		r.CleanupDisconnected(reconnectGrace)
		if r.IsEmpty() {
			h.rooms.Delete(roomID)
			log.Printf("room %s destroyed (grace expired)", roomID)
		}
	}()
}

func (h *Hub) handleJoin(client *ws.Client, msg *ws.InboundMessage) {
	if msg.RoomID == "" || msg.Name == "" {
		client.Send(&ws.OutboundMessage{Type: ws.TypeError, Error: "roomId and name are required"})
		return
	}

	r, _ := h.rooms.GetOrCreate(msg.RoomID)

	participant := &room.Participant{
		ID:       client.ID,
		Name:     msg.Name,
		Lang:     msg.Lang,
		JoinedAt: time.Now(),
	}

	_, reconnected, err := r.Add(participant)
	if err != nil {
		client.Send(&ws.OutboundMessage{Type: ws.TypeRoomFull})
		client.Close()
		return
	}

	h.mu.Lock()
	client.RoomID = msg.RoomID
	h.clientRooms[client.ID] = msg.RoomID
	h.mu.Unlock()

	// Send ICE server configuration to the joining client
	iceServers := h.buildICEServers()
	client.Send(&ws.OutboundMessage{
		Type:       ws.TypeICEServers,
		ICEServers: iceServers,
	})

	if reconnected {
		log.Printf("client %s (%s) reconnected to room %s", client.ID, msg.Name, msg.RoomID)
	} else {
		log.Printf("client %s (%s) joined room %s", client.ID, msg.Name, msg.RoomID)
	}

	// If there's a peer already in the room (connected, not disconnected), notify both sides.
	// The existing peer becomes the offerer, the new joiner becomes the answerer.
	// This prevents glare (both sides sending offers).
	peer := r.Peer(client.ID)
	if peer != nil && !peer.Disconnected {
		// New joiner: you are the answerer, wait for offer
		client.Send(&ws.OutboundMessage{
			Type: ws.TypePeerJoined,
			Name: peer.Name,
			Lang: peer.Lang,
			Role: "answerer",
		})
		// Existing peer: you are the offerer, create offer
		peerClient := h.findPeerClient(r, client.ID)
		if peerClient != nil {
			peerClient.Send(&ws.OutboundMessage{
				Type: ws.TypePeerJoined,
				Name: msg.Name,
				Lang: msg.Lang,
				Role: "offerer",
			})
		}
	}
}

const maxMessageLength = 450

func (h *Hub) handleChat(client *ws.Client, msg *ws.InboundMessage) {
	if msg.Text == "" {
		return
	}

	if len([]rune(msg.Text)) > maxMessageLength {
		client.Send(&ws.OutboundMessage{Type: ws.TypeError, Error: "message too long"})
		return
	}

	// Check chat rate limit
	if !h.rateLimiter.Allow(ratelimit.LimitChatMessage, client.ID) {
		client.Send(&ws.OutboundMessage{Type: ws.TypeError, Error: "rate_limited"})
		return
	}

	r := h.rooms.Get(client.RoomID)
	if r == nil {
		return
	}

	sender := r.Participant(client.ID)
	if sender == nil {
		return
	}

	peer := r.Peer(client.ID)
	if peer == nil {
		return
	}

	// Use chat processor for translation
	ctx := context.Background()
	forSender, forReceiver := h.chatProc.Process(ctx, sender, peer, msg.Text)

	// Store in room history
	r.AddChatMessage(room.ChatMessage{
		From:         sender.Name,
		OriginalText: msg.Text,
		Translated:   forReceiver.Translated,
		LangFrom:     sender.Lang,
		LangTo:       peer.Lang,
		Timestamp:    forReceiver.Timestamp,
	})

	// Send to both: sender gets translation echo, receiver gets translated message
	client.Send(forSender)
	peerClient := h.findPeerClient(r, client.ID)
	if peerClient != nil {
		peerClient.Send(forReceiver)
	}
}

func (h *Hub) handleLangChange(client *ws.Client, msg *ws.InboundMessage) {
	if msg.Lang == "" {
		return
	}

	r := h.rooms.Get(client.RoomID)
	if r == nil {
		return
	}

	p := r.Participant(client.ID)
	if p == nil {
		return
	}

	p.Lang = msg.Lang
	log.Printf("client %s changed language to %s", client.ID, msg.Lang)

	// Notify peer about language change
	peerClient := h.findPeerClient(r, client.ID)
	if peerClient != nil {
		peerClient.Send(&ws.OutboundMessage{
			Type: ws.TypeLangChange,
			Name: p.Name,
			Lang: msg.Lang,
		})
	}
}

// relayToPeer forwards a raw signaling message to the other participant in the room.
func (h *Hub) relayToPeer(client *ws.Client, raw []byte) {
	r := h.rooms.Get(client.RoomID)
	if r == nil {
		log.Printf("[relay] no room found for client %s (roomID=%s)", client.ID, client.RoomID)
		return
	}

	peerClient := h.findPeerClient(r, client.ID)
	if peerClient == nil {
		peer := r.Peer(client.ID)
		if peer == nil {
			log.Printf("[relay] no peer in room %s for client %s", client.RoomID, client.ID)
		} else {
			log.Printf("[relay] peer %s found in room but no ws.Client (disconnected=%v)", peer.ID, peer.Disconnected)
		}
		return
	}

	peerClient.SendBytes(raw)
}

func (h *Hub) findPeerClient(r *room.Room, excludeClientID string) *ws.Client {
	peer := r.Peer(excludeClientID)
	if peer == nil {
		return nil
	}
	h.mu.RLock()
	c := h.clients[peer.ID]
	h.mu.RUnlock()
	return c
}

func (h *Hub) buildICEServers() []ws.ICEServer {
	servers := []ws.ICEServer{
		{URLs: []string{"stun:stun.l.google.com:19302"}},
	}
	if h.config.TURNHost != "" {
		servers = append(servers, ws.ICEServer{
			URLs: []string{
				fmt.Sprintf("turn:%s:%d?transport=udp", h.config.TURNHost, h.config.TURNPort),
				fmt.Sprintf("turn:%s:%d?transport=tcp", h.config.TURNHost, h.config.TURNPort),
				fmt.Sprintf("turns:%s:5349?transport=tcp", h.config.TURNHost),
			},
			Username:   h.config.TURNUsername,
			Credential: h.config.TURNPassword,
		})
	}
	log.Printf("ICE servers config: TURN_HOST=%s, TURN_PORT=%d, entries=%d", h.config.TURNHost, h.config.TURNPort, len(servers))
	return servers
}
