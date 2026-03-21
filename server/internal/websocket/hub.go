package websocket

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
)

// Message represents the WebSocket message structure
type Message struct {
	Type      string          `json:"type"`
	SessionID string          `json:"session_id"`
	Payload   json.RawMessage `json:"payload"`
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients by SessionID
	rooms      map[string]map[*Client]bool
	roomsMu    sync.RWMutex
	
	broadcast  chan Message
	register   chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]map[*Client]bool),
		broadcast:  make(chan Message),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			slog.Info("WebSocket Hub shutting down")
			return
		case client := <-h.register:
			h.roomsMu.Lock()
			if h.rooms[client.SessionID] == nil {
				h.rooms[client.SessionID] = make(map[*Client]bool)
			}
			h.rooms[client.SessionID][client] = true
			h.roomsMu.Unlock()
			slog.Debug("client registered", "session_id", client.SessionID)

		case client := <-h.unregister:
			h.roomsMu.Lock()
			if _, ok := h.rooms[client.SessionID][client]; ok {
				delete(h.rooms[client.SessionID], client)
				close(client.send)
				if len(h.rooms[client.SessionID]) == 0 {
					delete(h.rooms, client.SessionID)
				}
			}
			h.roomsMu.Unlock()
			slog.Debug("client unregistered", "session_id", client.SessionID)

		case message := <-h.broadcast:
			h.roomsMu.RLock()
			clients := h.rooms[message.SessionID]
			if clients != nil {
				data, err := json.Marshal(message)
				if err != nil {
					slog.Error("failed to marshal broadcast message", "error", err)
					h.roomsMu.RUnlock()
					continue
				}

				for client := range clients {
					// Rule: Non-blocking send with select block
					select {
					case client.send <- data:
					default:
						// If client buffer is full, drop connection or message
						slog.Warn("client buffer full, dropping message", "session_id", client.SessionID)
						// We don't unregister here to avoid deadlock, but the client read/write loops will handle it
					}
				}
			}
			h.roomsMu.RUnlock()
		}
	}
}

func (h *Hub) Broadcast(sessionID string, msgType string, payload interface{}) {
	data, _ := json.Marshal(payload)
	h.broadcast <- Message{
		Type:      msgType,
		SessionID: sessionID,
		Payload:   data,
	}
}
