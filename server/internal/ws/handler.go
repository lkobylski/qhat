package ws

import (
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// NewHandler returns an HTTP handler that upgrades connections to WebSocket
// and creates a Client for each connection.
func NewHandler(msgHandler MessageHandler, allowedOrigins []string) http.Handler {
	originSet := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[o] = true
	}

	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if len(originSet) == 0 {
				return true
			}
			if originSet[origin] {
				return true
			}
			// Allow any localhost origin in dev (Vite may use different ports)
			if strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "http://127.0.0.1:") {
				return true
			}
			log.Printf("ws origin rejected: %q", origin)
			return false
		},
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("ws upgrade error: %v", err)
			return
		}

		clientID := uuid.New().String()
		client := NewClient(clientID, conn, msgHandler)
		if reg, ok := msgHandler.(interface{ Register(c *Client) }); ok {
			reg.Register(client)
		}
		log.Printf("ws connected: %s", clientID)
	})
}
