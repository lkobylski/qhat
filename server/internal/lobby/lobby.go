package lobby

import (
	"sync"
	"time"
)

// UserStatus represents a lobby user's availability.
type UserStatus string

const (
	StatusAvailable UserStatus = "available"
	StatusInCall    UserStatus = "in_call"
	StatusOffline   UserStatus = "offline"
)

// LobbyUser represents a user present in the public lobby.
type LobbyUser struct {
	ClientID     string
	Name         string
	Lang         string
	Status       UserStatus
	JoinedAt     time.Time
	Disconnected bool      // true during grace period (may reconnect)
	DisconnectAt time.Time
	LastSeenAt   time.Time // set when user goes offline
}

// Manager tracks all users currently in the public lobby.
type Manager struct {
	mu    sync.RWMutex
	users map[string]*LobbyUser // clientID -> LobbyUser
}

// NewManager creates an empty lobby manager.
func NewManager() *Manager {
	return &Manager{users: make(map[string]*LobbyUser)}
}

// Add registers a user in the lobby.
func (m *Manager) Add(user *LobbyUser) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.users[user.ClientID] = user
}

// Remove deletes a user from the lobby and returns them (or nil).
func (m *Manager) Remove(clientID string) *LobbyUser {
	m.mu.Lock()
	defer m.mu.Unlock()
	u := m.users[clientID]
	delete(m.users, clientID)
	return u
}

// Get returns a lobby user by client ID.
func (m *Manager) Get(clientID string) *LobbyUser {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.users[clientID]
}

// SetStatus updates a user's availability status.
func (m *Manager) SetStatus(clientID string, status UserStatus) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if u, ok := m.users[clientID]; ok {
		u.Status = status
	}
}

// MarkDisconnected marks a user as disconnected for grace period.
func (m *Manager) MarkDisconnected(clientID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if u, ok := m.users[clientID]; ok {
		u.Disconnected = true
		u.DisconnectAt = time.Now()
	}
}

// Reconnect removes any existing entries with the same name (stale or disconnected).
func (m *Manager) Reconnect(clientID, name string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	found := false
	for id, u := range m.users {
		if u.Name == name && id != clientID {
			delete(m.users, id)
			found = true
		}
	}
	return found
}

// MarkOffline transitions a user from disconnected to offline (visible but grayed out).
func (m *Manager) MarkOffline(clientID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if u, ok := m.users[clientID]; ok {
		u.Status = StatusOffline
		u.Disconnected = false
		u.LastSeenAt = time.Now()
	}
}

// CleanupOffline removes offline users older than the given duration.
func (m *Manager) CleanupOffline(maxAge time.Duration) []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	var removed []string
	now := time.Now()
	for id, u := range m.users {
		if u.Status == StatusOffline && now.Sub(u.LastSeenAt) > maxAge {
			delete(m.users, id)
			removed = append(removed, id)
		}
	}
	return removed
}

// CleanupDisconnected removes users disconnected longer than grace period.
func (m *Manager) CleanupDisconnected(grace time.Duration) []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	var removed []string
	now := time.Now()
	for id, u := range m.users {
		if u.Disconnected && now.Sub(u.DisconnectAt) > grace {
			delete(m.users, id)
			removed = append(removed, id)
		}
	}
	return removed
}

// List returns a snapshot of all lobby users (connected + offline, not disconnected grace period).
func (m *Manager) List() []LobbyUser {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make([]LobbyUser, 0, len(m.users))
	for _, u := range m.users {
		if !u.Disconnected { // skip grace-period users, include offline
			result = append(result, *u)
		}
	}
	return result
}

// Count returns the number of connected lobby users.
func (m *Manager) Count() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	count := 0
	for _, u := range m.users {
		if !u.Disconnected {
			count++
		}
	}
	return count
}
