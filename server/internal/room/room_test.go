package room

import (
	"testing"
	"time"
)

func TestRoomAddAndRemove(t *testing.T) {
	r := NewRoom("test-room-id-123456")

	if r.Code != "test-r" {
		t.Errorf("expected code 'test-r', got %q", r.Code)
	}

	p1 := &Participant{ID: "a", Name: "Alice", Lang: "EN", JoinedAt: time.Now()}
	p2 := &Participant{ID: "b", Name: "Bob", Lang: "ES", JoinedAt: time.Now()}
	p3 := &Participant{ID: "c", Name: "Charlie", Lang: "FR", JoinedAt: time.Now()}

	idx, reconnected, err := r.Add(p1)
	if err != nil || idx != 0 || reconnected {
		t.Fatalf("Add p1: idx=%d, reconnected=%v, err=%v", idx, reconnected, err)
	}

	if r.IsFull() {
		t.Error("room should not be full with 1 participant")
	}

	idx, reconnected, err = r.Add(p2)
	if err != nil || idx != 1 || reconnected {
		t.Fatalf("Add p2: idx=%d, reconnected=%v, err=%v", idx, reconnected, err)
	}

	if !r.IsFull() {
		t.Error("room should be full with 2 participants")
	}

	_, _, err = r.Add(p3)
	if err != ErrRoomFull {
		t.Errorf("expected ErrRoomFull, got %v", err)
	}

	peer := r.Peer("a")
	if peer == nil || peer.ID != "b" {
		t.Errorf("expected peer to be Bob, got %v", peer)
	}

	r.Remove("a")
	if r.IsEmpty() {
		t.Error("room should not be empty after removing one of two")
	}

	r.Remove("b")
	if !r.IsEmpty() {
		t.Error("room should be empty after removing all")
	}
}

func TestRoomReconnect(t *testing.T) {
	r := NewRoom("reconnect-test")

	p1 := &Participant{ID: "a", Name: "Alice", Lang: "EN", JoinedAt: time.Now()}
	p2 := &Participant{ID: "b", Name: "Bob", Lang: "ES", JoinedAt: time.Now()}
	r.Add(p1)
	r.Add(p2)

	// Alice disconnects
	r.MarkDisconnected("a")
	if r.IsEmpty() {
		t.Error("room should not be empty, Alice is in grace period")
	}

	// Alice reconnects with new client ID
	p1New := &Participant{ID: "a2", Name: "Alice", Lang: "EN", JoinedAt: time.Now()}
	idx, reconnected, err := r.Add(p1New)
	if err != nil {
		t.Fatalf("reconnect failed: %v", err)
	}
	if !reconnected {
		t.Error("expected reconnected=true")
	}
	if idx != 0 {
		t.Errorf("expected slot 0, got %d", idx)
	}

	// New participant should have new ID
	p := r.Participant("a2")
	if p == nil || p.Name != "Alice" {
		t.Error("expected Alice with new ID")
	}
}

func TestManagerGetOrCreate(t *testing.T) {
	m := NewManager()

	r1, created := m.GetOrCreate("room-1")
	if !created || r1 == nil {
		t.Fatal("expected new room to be created")
	}

	r2, created := m.GetOrCreate("room-1")
	if created || r2 != r1 {
		t.Fatal("expected existing room to be returned")
	}

	if m.Count() != 1 {
		t.Errorf("expected 1 room, got %d", m.Count())
	}

	m.Delete("room-1")
	if m.Count() != 0 {
		t.Errorf("expected 0 rooms after delete, got %d", m.Count())
	}
}

func TestManagerGetByCode(t *testing.T) {
	m := NewManager()
	m.GetOrCreate("abcdef-rest-of-uuid")

	r := m.GetByCode("abcdef")
	if r == nil {
		t.Fatal("expected to find room by code")
	}
	if r.ID != "abcdef-rest-of-uuid" {
		t.Errorf("wrong room found: %s", r.ID)
	}

	if m.GetByCode("xxxxxx") != nil {
		t.Error("expected nil for unknown code")
	}
}
