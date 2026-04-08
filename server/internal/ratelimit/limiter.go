package ratelimit

import (
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// LimitType defines the kind of rate limit to apply.
type LimitType int

const (
	LimitRoomCreation LimitType = iota // 10 per IP per hour
	LimitChatMessage                   // 60 per user per minute
	LimitFailedJoin                    // 5 per IP per 10 minutes
)

type bucket struct {
	limiter    *rate.Limiter
	lastAccess time.Time
}

// Limiter manages per-key rate limiting with automatic cleanup.
type Limiter struct {
	buckets map[string]*bucket
	mu      sync.Mutex
}

// NewLimiter creates a rate limiter.
func NewLimiter() *Limiter {
	return &Limiter{
		buckets: make(map[string]*bucket),
	}
}

// Allow checks whether an action is allowed under the given limit type and key.
func (l *Limiter) Allow(lt LimitType, key string) bool {
	compositeKey := compositeKey(lt, key)
	l.mu.Lock()
	defer l.mu.Unlock()

	b, ok := l.buckets[compositeKey]
	if !ok {
		r, burst := limitParams(lt)
		b = &bucket{
			limiter:    rate.NewLimiter(r, burst),
			lastAccess: time.Now(),
		}
		l.buckets[compositeKey] = b
	}
	b.lastAccess = time.Now()
	return b.limiter.Allow()
}

// StartCleanup runs a background goroutine that prunes expired buckets.
func (l *Limiter) StartCleanup(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			l.cleanup()
		}
	}()
}

func (l *Limiter) cleanup() {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	for key, b := range l.buckets {
		maxAge := 2 * time.Hour // default: room creation window * 2
		if len(key) > 5 && key[:5] == "chat:" {
			maxAge = 2 * time.Minute
		} else if len(key) > 5 && key[:5] == "fail:" {
			maxAge = 20 * time.Minute
		}
		if now.Sub(b.lastAccess) > maxAge {
			delete(l.buckets, key)
		}
	}
}

func compositeKey(lt LimitType, key string) string {
	switch lt {
	case LimitRoomCreation:
		return "room:" + key
	case LimitChatMessage:
		return "chat:" + key
	case LimitFailedJoin:
		return "fail:" + key
	default:
		return "unknown:" + key
	}
}

func limitParams(lt LimitType) (rate.Limit, int) {
	switch lt {
	case LimitRoomCreation:
		return rate.Every(6 * time.Minute), 2 // ~10/hour, burst 2
	case LimitChatMessage:
		return rate.Every(time.Second), 10 // ~60/min, burst 10
	case LimitFailedJoin:
		return rate.Every(2 * time.Minute), 2 // ~5/10min, burst 2
	default:
		return rate.Every(time.Second), 1
	}
}
