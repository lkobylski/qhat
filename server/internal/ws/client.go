package ws

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 8192
	sendBufSize    = 256
)

// MessageHandler processes raw JSON messages from a client.
type MessageHandler interface {
	Dispatch(client *Client, raw []byte)
	HandleDisconnect(client *Client)
}

// Client wraps a single WebSocket connection.
type Client struct {
	ID      string
	RoomID  string
	conn    *websocket.Conn
	send    chan []byte
	handler MessageHandler
	once    sync.Once
}

// NewClient creates a client and starts its read/write goroutines.
func NewClient(id string, conn *websocket.Conn, handler MessageHandler) *Client {
	c := &Client{
		ID:      id,
		conn:    conn,
		send:    make(chan []byte, sendBufSize),
		handler: handler,
	}
	go c.writePump()
	go c.readPump()
	return c
}

// Send marshals an outbound message and queues it for writing.
func (c *Client) Send(msg *OutboundMessage) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	select {
	case c.send <- data:
		return nil
	default:
		// send buffer full, close the client
		c.Close()
		return nil
	}
}

// SendBytes queues raw bytes for writing to the WebSocket.
func (c *Client) SendBytes(data []byte) {
	select {
	case c.send <- data:
	default:
		c.Close()
	}
}

// Close cleanly shuts down the client connection.
func (c *Client) Close() {
	c.once.Do(func() {
		close(c.send)
		c.conn.Close()
	})
}

func (c *Client) readPump() {
	defer func() {
		c.handler.HandleDisconnect(c)
		c.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("ws read error [%s]: %v", c.ID, err)
			}
			return
		}
		c.handler.Dispatch(c, message)
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				log.Printf("ws write error [%s]: %v", c.ID, err)
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
