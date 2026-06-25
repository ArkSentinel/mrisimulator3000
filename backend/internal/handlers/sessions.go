package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/scrmhoot/mri-backend/internal/database"
	"github.com/scrmhoot/mri-backend/internal/websocket"
)

type CreateSessionRequest struct {
	ProtocolID int `json:"protocol_id"`
	TimerBriefing int `json:"timer_briefing"`
	TimerSimulation int `json:"timer_simulation"`
}

type SessionResponse struct {
	ID            string    `json:"id"`
	ProtocolID    int       `json:"protocol_id"`
	TeacherID     int       `json:"teacher_id"`
	Phase         string    `json:"phase"`
	StudentCount  int       `json:"student_count"`
	CreatedAt     time.Time `json:"created_at"`
}

func CreateSession(c *fiber.Ctx) error {
	var req CreateSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	userID := c.Locals("user_id").(int)

	sessionID := generateSessionID()

	hub := c.Locals("hub").(*websocket.Hub)
	session := hub.CreateSession(sessionID, userID, req.ProtocolID)

	if req.TimerBriefing > 0 {
		session.PhaseTimer = req.TimerBriefing
	}

	return c.Status(201).JSON(SessionResponse{
		ID:            sessionID,
		ProtocolID:    req.ProtocolID,
		TeacherID:     userID,
		Phase:         session.Phase.String(),
		StudentCount:  0,
		CreatedAt:     session.CreatedAt,
	})
}

func GetSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")

	hub := c.Locals("hub").(*websocket.Hub)
	session, ok := hub.GetSession(sessionID)
	if !ok {
		return c.Status(404).JSON(fiber.Map{"error": "Session not found"})
	}

	session.Mu.RLock()
	studentCount := len(session.Students)
	session.Mu.RUnlock()

	return c.JSON(SessionResponse{
		ID:            session.ID,
		ProtocolID:    session.ProtocolID,
		TeacherID:     session.TeacherID,
		Phase:         session.Phase.String(),
		StudentCount:  studentCount,
		CreatedAt:     session.CreatedAt,
	})
}

func ListSessions(c *fiber.Ctx) error {
	hub := c.Locals("hub").(*websocket.Hub)

	hub.Mu.RLock()
	sessions := make([]SessionResponse, 0, len(hub.Sessions))
	for _, session := range hub.Sessions {
		session.Mu.RLock()
		studentCount := len(session.Students)
		phase := session.Phase.String()
		session.Mu.RUnlock()

		sessions = append(sessions, SessionResponse{
			ID:           session.ID,
			ProtocolID:   session.ProtocolID,
			TeacherID:    session.TeacherID,
			Phase:        phase,
			StudentCount: studentCount,
			CreatedAt:    session.CreatedAt,
		})
	}
	hub.Mu.RUnlock()

	return c.JSON(sessions)
}

func JoinSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	userID := c.Locals("user_id").(int)

	hub := c.Locals("hub").(*websocket.Hub)
	_, ok := hub.GetSession(sessionID)
	if !ok {
		return c.Status(404).JSON(fiber.Map{"error": "Session not found"})
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"session_id": sessionID,
		"user_id":   userID,
		"ws_url":    "/ws?session_id=" + sessionID + "&user_id=" + itoa(userID),
	})
}

func LeaveSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	userID := c.Locals("user_id").(int)

	hub := c.Locals("hub").(*websocket.Hub)
	hub.RemoveStudentFromSession(sessionID, userID)

	return c.JSON(fiber.Map{"success": true})
}

func StartSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	userID := c.Locals("user_id").(int)

	hub := c.Locals("hub").(*websocket.Hub)
	session, ok := hub.GetSession(sessionID)
	if !ok {
		return c.Status(404).JSON(fiber.Map{"error": "Session not found"})
	}

	if session.TeacherID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only the teacher can start the session"})
	}

	hub.SetSessionPhase(sessionID, websocket.SIMULATION, 180)

	return c.JSON(fiber.Map{
		"success": true,
		"phase":   "SIMULATION",
		"timer":   180,
	})
}

func ChangePhase(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	userID := c.Locals("user_id").(int)

	var req struct {
		Phase string `json:"phase"`
		Timer int    `json:"timer"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	hub := c.Locals("hub").(*websocket.Hub)
	session, ok := hub.GetSession(sessionID)
	if !ok {
		return c.Status(404).JSON(fiber.Map{"error": "Session not found"})
	}

	if session.TeacherID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only the teacher can change phase"})
	}

	var phase websocket.Phase
	switch strings.ToUpper(req.Phase) {
	case "BRIEFING":
		phase = websocket.BRIEFING
	case "SIMULATION":
		phase = websocket.SIMULATION
	case "ACQUISITION":
		phase = websocket.ACQUISITION
	case "PODIUM":
		phase = websocket.PODIUM
	default:
		return c.Status(400).JSON(fiber.Map{"error": "Invalid phase"})
	}

	timer := req.Timer
	if timer <= 0 {
		timer = 60
	}

	hub.SetSessionPhase(sessionID, phase, timer)
	hub.BroadcastToSession(sessionID, websocket.WSMessage{
		Type: websocket.MSG_PHASE_CHANGE,
		Payload: websocket.PhaseChangePayload{
			SessionID: sessionID,
			Phase:     phase,
			Timer:     timer,
		},
	})

	return c.JSON(fiber.Map{
		"success": true,
		"phase":   phase.String(),
		"timer":   timer,
	})
}

func GetLeaderboard(c *fiber.Ctx) error {
	sessionID := c.Params("id")

	hub := c.Locals("hub").(*websocket.Hub)
	rankings := hub.GetLeaderboard(sessionID)

	return c.JSON(fiber.Map{
		"session_id": sessionID,
		"rankings":   rankings,
	})
}

func CloseSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	userID := c.Locals("user_id").(int)

	hub := c.Locals("hub").(*websocket.Hub)
	session, ok := hub.GetSession(sessionID)
	if !ok {
		return c.Status(404).JSON(fiber.Map{"error": "Session not found"})
	}

	if session.TeacherID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only the teacher can close the session"})
	}

	if err := persistSessionToDB(session); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to persist session: " + err.Error()})
	}

	hub.CloseSession(sessionID)

	return c.JSON(fiber.Map{"success": true})
}

func persistSessionToDB(session *websocket.Session) error {
	sessionJSON, _ := json.Marshal(map[string]interface{}{
		"phase":      session.Phase.String(),
		"timer":      session.PhaseTimer,
		"started_at": session.TimerStart,
	})

	result, err := database.DB.Exec(`
		INSERT INTO salas (nombre, docente_id, protocolo_id, estado, config_json, started_at, ended_at)
		VALUES (?, ?, ?, 'finalizada', ?, ?, NOW())
	`, session.ID, session.TeacherID, session.ProtocolID, string(sessionJSON), session.CreatedAt)
	if err != nil {
		return err
	}

	salaID, _ := result.LastInsertId()

	for _, student := range session.Students {
		student.Mu.Lock()
		examCount := len(student.Submissions)
		student.Mu.Unlock()

		_, err := database.DB.Exec(`
			INSERT INTO sala_participantes (sala_id, usuario_id, score_acumulado, examenes_completados)
			VALUES (?, ?, ?, ?)
		`, salaID, student.UserID, student.Score, examCount)
		if err != nil {
			continue
		}
	}

	return nil
}

func generateSessionID() string {
	bytes := make([]byte, 4)
	rand.Read(bytes)
	return strings.ToUpper(hex.EncodeToString(bytes))
}

func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	var b [20]byte
	pos := len(b)
	for i > 0 {
		pos--
		b[pos] = byte('0' + i%10)
		i /= 10
	}
	return string(b[pos:])
}