package signaling

import (
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/lkobylski/qhat/server/internal/lobby"
	"github.com/lkobylski/qhat/server/internal/ws"
)

const (
	lobbyGrace     = 5 * time.Second
	callTimeout    = 30 * time.Second
)

func (h *Hub) handleLobbyJoin(client *ws.Client, msg *ws.InboundMessage) {
	if msg.Name == "" {
		client.Send(&ws.OutboundMessage{Type: ws.TypeError, Error: "name is required"})
		return
	}

	// Check if this is a reconnect (same client ID already in lobby)
	existing := h.lobby.Get(client.ID)
	isReconnect := existing != nil

	// Remove any stale entries for same name with different ID
	h.lobby.Reconnect(client.ID, msg.Name)
	// Clean lobbyClients map for removed entries
	h.mu.Lock()
	for id := range h.lobbyClients {
		if h.lobby.Get(id) == nil && id != client.ID {
			delete(h.lobbyClients, id)
		}
	}
	h.mu.Unlock()

	user := &lobby.LobbyUser{
		ClientID: client.ID,
		Name:     msg.Name,
		Lang:     msg.Lang,
		Status:   lobby.StatusAvailable,
		JoinedAt: time.Now(),
	}
	h.lobby.Add(user)

	h.mu.Lock()
	h.lobbyClients[client.ID] = true
	h.mu.Unlock()

	if isReconnect {
		log.Printf("[lobby] %s (%s) reconnected to lobby", client.ID, msg.Name)
	} else {
		log.Printf("[lobby] %s (%s) joined lobby", client.ID, msg.Name)
	}

	// Always send full user list to the joining/reconnecting client
	users := h.lobby.List()
	dtos := make([]ws.LobbyUserDTO, 0, len(users))
	for _, u := range users {
		if u.ClientID == client.ID {
			continue
		}
		dtos = append(dtos, toLobbyDTO(&u))
	}
	client.Send(&ws.OutboundMessage{
		Type:     ws.TypeLobbyUsers,
		Users:    dtos,
		CallerID: client.ID,
	})

	// Only broadcast to others if this is a NEW user, not a reconnect
	if !isReconnect {
		dto := toLobbyDTO(user)
		h.broadcastToLobby(&ws.OutboundMessage{
			Type: ws.TypeLobbyUserJoin,
			User: &dto,
		}, client.ID)
	}
}

func (h *Hub) handleLobbyLeave(client *ws.Client) {
	h.removeLobbyClient(client.ID)
}

func (h *Hub) handleCallRequest(client *ws.Client, msg *ws.InboundMessage) {
	if msg.TargetID == "" {
		client.Send(&ws.OutboundMessage{Type: ws.TypeError, Error: "targetId is required"})
		return
	}

	caller := h.lobby.Get(client.ID)
	if caller == nil || caller.Status != lobby.StatusAvailable {
		client.Send(&ws.OutboundMessage{Type: ws.TypeError, Error: "you are not available"})
		return
	}

	target := h.lobby.Get(msg.TargetID)
	if target == nil || target.Status != lobby.StatusAvailable {
		client.Send(&ws.OutboundMessage{Type: ws.TypeError, Error: "user is not available"})
		return
	}

	// Store pending call
	h.mu.Lock()
	h.pendingCalls[client.ID] = msg.TargetID
	h.mu.Unlock()

	// Set caller status to in_call to prevent double-calls
	h.lobby.SetStatus(client.ID, lobby.StatusInCall)
	callerDTO := toLobbyDTO(caller)
	callerDTO.Status = string(lobby.StatusInCall)
	h.broadcastToLobby(&ws.OutboundMessage{
		Type: ws.TypeLobbyUpdate,
		User: &callerDTO,
	}, "")

	log.Printf("[lobby] %s calling %s", caller.Name, target.Name)

	// Send incoming call to target
	h.mu.RLock()
	targetClient := h.clients[msg.TargetID]
	h.mu.RUnlock()
	if targetClient != nil {
		targetClient.Send(&ws.OutboundMessage{
			Type:       ws.TypeCallIncoming,
			CallerID:   client.ID,
			CallerName: caller.Name,
			CallerLang: caller.Lang,
		})
	}

	// Auto-cancel after timeout
	go func() {
		time.Sleep(callTimeout)
		h.mu.RLock()
		targetID, exists := h.pendingCalls[client.ID]
		h.mu.RUnlock()
		if exists && targetID == msg.TargetID {
			h.cancelPendingCall(client.ID, msg.TargetID)
		}
	}()
}

func (h *Hub) handleCallAccept(client *ws.Client, msg *ws.InboundMessage) {
	if msg.CallerID == "" {
		return
	}

	h.mu.RLock()
	targetID, exists := h.pendingCalls[msg.CallerID]
	h.mu.RUnlock()
	if !exists || targetID != client.ID {
		client.Send(&ws.OutboundMessage{Type: ws.TypeError, Error: "no pending call"})
		return
	}

	// Clear pending call
	h.mu.Lock()
	delete(h.pendingCalls, msg.CallerID)
	h.mu.Unlock()

	// Set both users as in_call
	h.lobby.SetStatus(client.ID, lobby.StatusInCall)
	h.lobby.SetStatus(msg.CallerID, lobby.StatusInCall)

	// Broadcast status updates
	accepter := h.lobby.Get(client.ID)
	if accepter != nil {
		dto := toLobbyDTO(accepter)
		h.broadcastToLobby(&ws.OutboundMessage{Type: ws.TypeLobbyUpdate, User: &dto}, "")
	}

	// Create a room for the call (full UUID as room ID, first 6 chars as shareable code)
	roomID := uuid.New().String()
	r, _ := h.rooms.GetOrCreate(roomID)

	log.Printf("[lobby] call accepted: %s <-> %s, room %s (code %s)", msg.CallerID, client.ID, roomID, r.Code)

	// Send call_start to both — use room code for the shareable link
	startMsg := &ws.OutboundMessage{
		Type:     ws.TypeCallStart,
		RoomCode: r.Code,
	}

	h.mu.RLock()
	callerClient := h.clients[msg.CallerID]
	h.mu.RUnlock()
	if callerClient != nil {
		callerClient.Send(startMsg)
	}
	client.Send(startMsg)
}

func (h *Hub) handleCallDecline(client *ws.Client, msg *ws.InboundMessage) {
	if msg.CallerID == "" {
		return
	}

	h.mu.RLock()
	targetID, exists := h.pendingCalls[msg.CallerID]
	h.mu.RUnlock()
	if !exists || targetID != client.ID {
		return
	}

	h.mu.Lock()
	delete(h.pendingCalls, msg.CallerID)
	h.mu.Unlock()

	// Reset caller status
	h.lobby.SetStatus(msg.CallerID, lobby.StatusAvailable)
	caller := h.lobby.Get(msg.CallerID)
	if caller != nil {
		dto := toLobbyDTO(caller)
		h.broadcastToLobby(&ws.OutboundMessage{Type: ws.TypeLobbyUpdate, User: &dto}, "")
	}

	// Notify caller
	h.mu.RLock()
	callerClient := h.clients[msg.CallerID]
	h.mu.RUnlock()
	if callerClient != nil {
		callerClient.Send(&ws.OutboundMessage{Type: ws.TypeCallDeclined})
	}

	log.Printf("[lobby] call declined by %s", client.ID)
}

func (h *Hub) handleCallCancel(client *ws.Client) {
	h.mu.RLock()
	targetID, exists := h.pendingCalls[client.ID]
	h.mu.RUnlock()
	if !exists {
		return
	}
	h.cancelPendingCall(client.ID, targetID)
}

func (h *Hub) cancelPendingCall(callerID, targetID string) {
	h.mu.Lock()
	delete(h.pendingCalls, callerID)
	h.mu.Unlock()

	// Reset caller status
	h.lobby.SetStatus(callerID, lobby.StatusAvailable)
	caller := h.lobby.Get(callerID)
	if caller != nil {
		dto := toLobbyDTO(caller)
		h.broadcastToLobby(&ws.OutboundMessage{Type: ws.TypeLobbyUpdate, User: &dto}, "")
	}

	// Notify target
	h.mu.RLock()
	targetClient := h.clients[targetID]
	h.mu.RUnlock()
	if targetClient != nil {
		targetClient.Send(&ws.OutboundMessage{Type: ws.TypeCallCancelled})
	}

	log.Printf("[lobby] call cancelled: %s -> %s", callerID, targetID)
}

func (h *Hub) handleLobbyDM(client *ws.Client, msg *ws.InboundMessage) {
	if msg.TargetID == "" || msg.Text == "" {
		return
	}

	if len([]rune(msg.Text)) > maxMessageLength {
		client.Send(&ws.OutboundMessage{Type: ws.TypeError, Error: "message too long"})
		return
	}

	sender := h.lobby.Get(client.ID)
	if sender == nil {
		return
	}

	target := h.lobby.Get(msg.TargetID)
	if target == nil {
		return
	}

	ts := time.Now().Unix()

	// Translate if different languages
	translated := msg.Text
	translationFailed := false
	if sender.Lang != target.Lang {
		result, err := h.chatProc.Translator().Translate(context.Background(), msg.Text, sender.Lang, target.Lang)
		if err != nil {
			log.Printf("lobby DM translation failed: %v", err)
			translationFailed = true
		} else {
			translated = result
		}
	}

	// Send to target
	h.mu.RLock()
	targetClient := h.clients[msg.TargetID]
	h.mu.RUnlock()
	if targetClient != nil {
		targetClient.Send(&ws.OutboundMessage{
			Type:              ws.TypeLobbyDM,
			From:              sender.Name,
			CallerID:          client.ID,
			Original:          msg.Text,
			Translated:        translated,
			LangFrom:          sender.Lang,
			LangTo:            target.Lang,
			Timestamp:         ts,
			TranslationFailed: translationFailed,
		})
	}

	// Echo back to sender with translation
	client.Send(&ws.OutboundMessage{
		Type:              ws.TypeLobbyDM,
		From:              sender.Name,
		CallerID:          client.ID,
		Original:          msg.Text,
		Translated:        translated,
		LangFrom:          sender.Lang,
		LangTo:            target.Lang,
		Timestamp:         ts,
		TranslationFailed: translationFailed,
	})
}

func (h *Hub) removeLobbyClient(clientID string) {
	user := h.lobby.Remove(clientID)
	if user == nil {
		return
	}

	h.mu.Lock()
	delete(h.lobbyClients, clientID)
	h.mu.Unlock()

	log.Printf("[lobby] %s (%s) left lobby", clientID, user.Name)

	// Cancel any pending calls involving this user
	h.mu.RLock()
	targetID, isCaller := h.pendingCalls[clientID]
	h.mu.RUnlock()
	if isCaller {
		h.cancelPendingCall(clientID, targetID)
	}

	// Also check if someone was calling this user
	h.mu.Lock()
	for callerID, tID := range h.pendingCalls {
		if tID == clientID {
			delete(h.pendingCalls, callerID)
			// Reset caller status
			h.lobby.SetStatus(callerID, lobby.StatusAvailable)
			if c := h.lobby.Get(callerID); c != nil {
				dto := toLobbyDTO(c)
				h.broadcastToLobby(&ws.OutboundMessage{Type: ws.TypeLobbyUpdate, User: &dto}, "")
			}
			// Notify caller
			if cc, ok := h.clients[callerID]; ok {
				cc.Send(&ws.OutboundMessage{Type: ws.TypeCallCancelled})
			}
		}
	}
	h.mu.Unlock()

	// Broadcast leave
	dto := toLobbyDTO(user)
	h.broadcastToLobby(&ws.OutboundMessage{
		Type: ws.TypeLobbyUserLeft,
		User: &dto,
	}, "")
}

func (h *Hub) handleLobbyDisconnect(clientID string) {
	h.mu.RLock()
	inLobby := h.lobbyClients[clientID]
	h.mu.RUnlock()
	if !inLobby {
		return
	}

	// Mark as disconnected with grace period — DON'T broadcast yet.
	// If user reconnects within grace period, no one notices they left.
	h.lobby.MarkDisconnected(clientID)
	log.Printf("[lobby] %s disconnected (grace %s)", clientID, lobbyGrace)

	// After grace period, if still disconnected → broadcast leave + cleanup
	go func() {
		time.Sleep(lobbyGrace)

		user := h.lobby.Get(clientID)
		if user == nil {
			// Already removed (reconnected and replaced)
			return
		}
		if !user.Disconnected {
			// Reconnected within grace period
			return
		}

		// Still disconnected after grace — actually remove
		h.lobby.Remove(clientID)
		h.mu.Lock()
		delete(h.lobbyClients, clientID)
		h.mu.Unlock()

		log.Printf("[lobby] %s removed after grace period", clientID)

		dto := toLobbyDTO(user)
		h.broadcastToLobby(&ws.OutboundMessage{
			Type: ws.TypeLobbyUserLeft,
			User: &dto,
		}, "")
	}()
}

func (h *Hub) broadcastToLobby(msg *ws.OutboundMessage, excludeID string) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for id, inLobby := range h.lobbyClients {
		if !inLobby || id == excludeID {
			continue
		}
		if c, ok := h.clients[id]; ok {
			c.Send(msg)
		}
	}
}

func toLobbyDTO(u *lobby.LobbyUser) ws.LobbyUserDTO {
	return ws.LobbyUserDTO{
		ID:     u.ClientID,
		Name:   u.Name,
		Lang:   u.Lang,
		Status: string(u.Status),
	}
}
