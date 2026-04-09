package room

import (
	"log"
	"sync"
	"time"
)

// Manager handles creation, lookup, and cleanup of rooms.
type Manager struct {
	rooms    map[string]*Room  // room ID → *Room
	byCode   map[string]string // room code → room ID
	mu       sync.RWMutex
}

// NewManager creates an empty room manager.
func NewManager() *Manager {
	return &Manager{
		rooms:  make(map[string]*Room),
		byCode: make(map[string]string),
	}
}

// GetOrCreate returns an existing room or creates a new one. The second return
// value is true when a new room was created.
func (m *Manager) GetOrCreate(roomID string) (*Room, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if r, ok := m.rooms[roomID]; ok {
		return r, false
	}

	r := NewRoom(roomID)
	m.rooms[roomID] = r
	m.byCode[r.Code] = roomID
	return r, true
}

// Get returns a room by ID, or nil if not found.
func (m *Manager) Get(roomID string) *Room {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.rooms[roomID]
}

// GetByCode finds a room whose Code matches the given string. O(1) lookup.
func (m *Manager) GetByCode(code string) *Room {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if roomID, ok := m.byCode[code]; ok {
		return m.rooms[roomID]
	}
	return nil
}

// Delete removes a room from the manager.
func (m *Manager) Delete(roomID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if r, ok := m.rooms[roomID]; ok {
		delete(m.byCode, r.Code)
	}
	delete(m.rooms, roomID)
}

// StartCleanup runs a goroutine that periodically removes empty rooms.
func (m *Manager) StartCleanup(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			m.cleanupEmpty()
		}
	}()
}

func (m *Manager) cleanupEmpty() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for id, r := range m.rooms {
		if r.IsEmpty() {
			log.Printf("cleanup: removing empty room %s", id)
			delete(m.byCode, r.Code)
			delete(m.rooms, id)
		}
	}
}

// Count returns the total number of active rooms.
func (m *Manager) Count() int {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return len(m.rooms)
}
