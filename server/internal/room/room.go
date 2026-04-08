package room

import (
	"errors"
	"sync"
	"time"
)

var (
	ErrRoomFull = errors.New("room is full")
)

// Participant represents a user connected to a room.
type Participant struct {
	ID       string
	Name     string
	Lang     string
	JoinedAt time.Time
}

// ChatMessage stores a single chat message in room history.
type ChatMessage struct {
	From         string
	OriginalText string
	Translated   string
	LangFrom     string
	LangTo       string
	Timestamp    int64
}

// Room represents a 1:1 video chat session.
type Room struct {
	ID           string
	Code         string // first 6 chars of ID
	Participants [2]*Participant
	History      []ChatMessage
	CreatedAt    time.Time
	mu           sync.RWMutex
}

// NewRoom creates a room with the given ID.
func NewRoom(id string) *Room {
	code := id
	if len(code) > 6 {
		code = code[:6]
	}
	return &Room{
		ID:        id,
		Code:      code,
		CreatedAt: time.Now(),
	}
}

// Add places a participant into the first available slot.
func (r *Room) Add(p *Participant) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i := range r.Participants {
		if r.Participants[i] == nil {
			r.Participants[i] = p
			return i, nil
		}
	}
	return -1, ErrRoomFull
}

// Remove removes a participant by ID and returns true if removed.
func (r *Room) Remove(id string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i := range r.Participants {
		if r.Participants[i] != nil && r.Participants[i].ID == id {
			r.Participants[i] = nil
			return true
		}
	}
	return false
}

// Peer returns the other participant in the room (not matching the given ID).
func (r *Room) Peer(id string) *Participant {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, p := range r.Participants {
		if p != nil && p.ID != id {
			return p
		}
	}
	return nil
}

// Participant returns the participant matching the given ID.
func (r *Room) Participant(id string) *Participant {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, p := range r.Participants {
		if p != nil && p.ID == id {
			return p
		}
	}
	return nil
}

// IsFull returns true when both participant slots are occupied.
func (r *Room) IsFull() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.Participants[0] != nil && r.Participants[1] != nil
}

// IsEmpty returns true when no participants are connected.
func (r *Room) IsEmpty() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.Participants[0] == nil && r.Participants[1] == nil
}

// ParticipantCount returns the number of connected participants.
func (r *Room) ParticipantCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	count := 0
	for _, p := range r.Participants {
		if p != nil {
			count++
		}
	}
	return count
}

// AddChatMessage appends a message to the room history.
func (r *Room) AddChatMessage(msg ChatMessage) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.History = append(r.History, msg)
}
