package ws

import (
	"log"
	"net/http"

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
			if len(originSet) == 0 {
				return true
			}
			origin := r.Header.Get("Origin")
			return originSet[origin]
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
