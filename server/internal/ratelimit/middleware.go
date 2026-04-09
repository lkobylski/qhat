package ratelimit

import (
	"net"
	"net/http"
	"strings"
)

// IPMiddleware checks the room creation rate limit before allowing the request.
func IPMiddleware(rl *Limiter, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := extractIP(r)
		if !rl.Allow(LimitRoomCreation, ip) {
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ExtractIP returns the client IP from the request, handling proxy headers.
func ExtractIP(r *http.Request) string {
	return extractIP(r)
}

func extractIP(r *http.Request) string {
	// Check X-Forwarded-For for proxied requests (take first IP in chain)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if parts := strings.SplitN(xff, ",", 2); len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
		return xff
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
