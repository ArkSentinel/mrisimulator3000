package websocket

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"strings"
	"sync"

	"github.com/gofiber/fiber/v2"
	gwebsocket "github.com/gofiber/websocket/v2"
	"golang.org/x/time/rate"
)

type limiter struct {
	visitors map[string]*rate.Limiter
	mu       sync.RWMutex
	r        rate.Limit
	b        int
}

var globalLimiter = &limiter{
	visitors: make(map[string]*rate.Limiter),
	r:        10,
	b:        20,
}

func getLimiter(ip string) *rate.Limiter {
	globalLimiter.mu.Lock()
	defer globalLimiter.mu.Unlock()

	limiter, exists := globalLimiter.visitors[ip]
	if !exists {
		limiter = rate.NewLimiter(globalLimiter.r, globalLimiter.b)
		globalLimiter.visitors[ip] = limiter
	}

	return limiter
}

func generateSessionID() string {
	bytes := make([]byte, 4)
	rand.Read(bytes)
	return strings.ToUpper(hex.EncodeToString(bytes))
}

func parseInt(s string) int {
	var n int
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int(c-'0')
		}
	}
	return n
}

func NewWebSocketHandler(hub *Hub) fiber.Handler {
	return gwebsocket.New(func(c *gwebsocket.Conn) {
		userID := c.Query("user_id")
		role := c.Query("role")

		if userID == "" || role == "" {
			c.WriteJSON(WSMessage{
				Type:    MSG_ERROR,
				Payload: &WSError{Code: "INVALID_PARAMS", Message: "user_id and role required"},
			})
			c.Close()
			return
		}

		client := &ClientInfo{
			Conn:      c,
			UserID:    parseInt(userID),
			SessionID: "",
			Role:      role,
		}

		hub.Register <- client

		defer func() {
			hub.Unregister <- c
		}()

		for {
			_, msg, err := c.ReadMessage()
			if err != nil {
				break
			}

			var wsMsg WSMessage
			if err := json.Unmarshal(msg, &wsMsg); err != nil {
				continue
			}

			handleMessage(hub, client, &wsMsg, c)
		}
	})
}

func handleMessage(hub *Hub, client *ClientInfo, msg *WSMessage, c *gwebsocket.Conn) {
	switch msg.Type {
	case MSG_JOIN:
		handleJoin(hub, client, msg, c)
	case MSG_LEAVE:
		handleLeave(hub, client)
	case MSG_START:
		handleStart(hub, client)
	case MSG_PAUSE:
		handlePause(hub, client)
	case MSG_RESUME:
		handleResume(hub, client)
	case MSG_SUBMIT:
		handleSubmit(hub, client, msg)
	case MSG_STUDENT_READY:
		handleStudentReady(hub, client)
	case MSG_END:
		handleEnd(hub, client)
	}
}

func handleJoin(hub *Hub, client *ClientInfo, msg *WSMessage, c *gwebsocket.Conn) {
	var payload JoinPayload
	if err := json.Unmarshal(msg.Payload.(json.RawMessage), &payload); err != nil {
		return
	}

	session, ok := hub.GetSession(payload.SessionID)
	if !ok {
		c.WriteJSON(WSMessage{
			Type:    MSG_ERROR,
			Payload: ErrSessionNotFound,
		})
		return
	}

	nombre := c.Query("nombre", "Anonymous")
	err := hub.AddStudentToSession(payload.SessionID, client.UserID, nombre, c)
	if err != nil {
		c.WriteJSON(WSMessage{
			Type:    MSG_ERROR,
			Payload: &WSError{Code: "JOIN_FAILED", Message: err.Error()},
		})
		return
	}

	client.SessionID = payload.SessionID

	leaderboard := hub.GetLeaderboard(payload.SessionID)
	c.WriteJSON(WSMessage{
		Type: MSG_LEADERBOARD,
		Payload: LeaderboardPayload{
			SessionID:  payload.SessionID,
			Rankings:   leaderboard,
			Phase:      session.Phase,
			PhaseTimer: session.PhaseTimer,
		},
	})

	hub.BroadcastToSession(payload.SessionID, WSMessage{
		Type:    MSG_JOIN,
		Payload: map[string]interface{}{"user_id": client.UserID, "nombre": nombre},
	})
}

func handleLeave(hub *Hub, client *ClientInfo) {
	if client.SessionID != "" {
		hub.RemoveStudentFromSession(client.SessionID, client.UserID)
		hub.BroadcastToSession(client.SessionID, WSMessage{
			Type:    MSG_LEAVE,
			Payload: map[string]interface{}{"user_id": client.UserID},
		})
		client.SessionID = ""
	}
}

func handleStart(hub *Hub, client *ClientInfo) {
	if client.Role != "teacher" {
		return
	}

	session, ok := hub.GetSession(client.SessionID)
	if !ok {
		return
	}

	if session.TeacherID != client.UserID {
		return
	}

	hub.SetSessionPhase(client.SessionID, SIMULATION, 180)
	hub.BroadcastToSession(client.SessionID, WSMessage{
		Type: MSG_PHASE_CHANGE,
		Payload: PhaseChangePayload{
			SessionID: client.SessionID,
			Phase:     SIMULATION,
			Timer:     180,
		},
	})
}

func handlePause(hub *Hub, client *ClientInfo) {
	if client.Role != "teacher" {
		return
	}

	hub.BroadcastToSession(client.SessionID, WSMessage{
		Type:    MSG_PAUSE,
		Payload: map[string]interface{}{"session_id": client.SessionID},
	})
}

func handleResume(hub *Hub, client *ClientInfo) {
	if client.Role != "teacher" {
		return
	}

	hub.BroadcastToSession(client.SessionID, WSMessage{
		Type:    MSG_RESUME,
		Payload: map[string]interface{}{"session_id": client.SessionID},
	})
}

func handleEnd(hub *Hub, client *ClientInfo) {
	if client.Role != "teacher" {
		return
	}

	session, ok := hub.GetSession(client.SessionID)
	if !ok {
		return
	}

	if session.TeacherID != client.UserID {
		return
	}

	hub.BroadcastToSession(client.SessionID, WSMessage{
		Type:    MSG_SESSION_ENDED,
		Payload: map[string]interface{}{"session_id": client.SessionID},
	})
}

func handleSubmit(hub *Hub, client *ClientInfo, msg *WSMessage) {
	var payload SubmitPayload
	data, _ := json.Marshal(msg.Payload)
	json.Unmarshal(data, &payload)

	submission, err := hub.ProcessSubmission(client.UserID, client.SessionID, payload)
	if err != nil {
		client.Conn.WriteJSON(WSMessage{
			Type:    MSG_ERROR,
			Payload: &WSError{Code: "SUBMIT_FAILED", Message: err.Error()},
		})
		return
	}

	leaderboard := hub.GetLeaderboard(client.SessionID)
	hub.BroadcastToSession(client.SessionID, WSMessage{
		Type: MSG_LEADERBOARD,
		Payload: LeaderboardPayload{
			SessionID: client.SessionID,
			Rankings:  leaderboard,
		},
	})

	client.Conn.WriteJSON(WSMessage{
		Type:    MSG_SUBMIT,
		Payload: map[string]interface{}{"success": true, "p_total": submission.P_total, "m_tiempo": submission.M_tiempo},
	})
}

func handleStudentReady(hub *Hub, client *ClientInfo) {
	hub.Mu.RLock()
	session, ok := hub.Sessions[client.SessionID]
	hub.Mu.RUnlock()

	if !ok {
		return
	}

	session.Mu.Lock()
	if student, exists := session.Students[client.UserID]; exists {
		student.IsReady = !student.IsReady
	}
	session.Mu.Unlock()

	hub.BroadcastToSession(client.SessionID, WSMessage{
		Type:    MSG_STUDENT_READY,
		Payload: map[string]interface{}{"user_id": client.UserID, "ready": true},
	})

	allReady := true
	session.Mu.RLock()
	for _, s := range session.Students {
		if !s.IsReady {
			allReady = false
			break
		}
	}
	session.Mu.RUnlock()

	if allReady && len(session.Students) > 0 {
		hub.BroadcastToSession(client.SessionID, WSMessage{
			Type:    MSG_ALL_READY,
			Payload: map[string]interface{}{"session_id": client.SessionID},
		})
	}
}