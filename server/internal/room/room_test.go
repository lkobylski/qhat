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

	idx, err := r.Add(p1)
	if err != nil || idx != 0 {
		t.Fatalf("Add p1: idx=%d, err=%v", idx, err)
	}

	if r.IsFull() {
		t.Error("room should not be full with 1 participant")
	}

	idx, err = r.Add(p2)
	if err != nil || idx != 1 {
		t.Fatalf("Add p2: idx=%d, err=%v", idx, err)
	}

	if !r.IsFull() {
		t.Error("room should be full with 2 participants")
	}

	_, err = r.Add(p3)
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
