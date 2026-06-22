package websocket

import (
	"encoding/json"
	"sync"
	"time"

	gwebsocket "github.com/gofiber/websocket/v2"
)

type Phase int

const (
	BRIEFING Phase = iota
	SIMULATION
	ACQUISITION
	PODIUM
)

func (p Phase) String() string {
	switch p {
	case BRIEFING:
		return "BRIEFING"
	case SIMULATION:
		return "SIMULATION"
	case ACQUISITION:
		return "ACQUISITION"
	case PODIUM:
		return "PODIUM"
	default:
		return "UNKNOWN"
	}
}

type Session struct {
	ID          string
	TeacherID   int
	Phase       Phase
	Students    map[int]*Student
	ProtocolID  int
	CreatedAt   time.Time
	TimerStart  time.Time
	PhaseTimer  int
	Mu          sync.RWMutex
}

type Student struct {
	UserID      int
	Nombre      string
	Conn        *gwebsocket.Conn
	Score       float64
	Streak      int
	IsReady     bool
	Submissions []Submission
	Mu          sync.Mutex
}

type Submission struct {
	SequenceName string
	P_geo        float64
	P_ant        float64
	P_param      float64
	TimeMs       int
	M_tiempo     float64
	P_total      float64
	SubmittedAt  time.Time
}

type Hub struct {
	Sessions   map[string]*Session
	Clients    map[*gwebsocket.Conn]*ClientInfo
	Register   chan *ClientInfo
	Unregister chan *gwebsocket.Conn
	Mu         sync.RWMutex
}

type ClientInfo struct {
	Conn      *gwebsocket.Conn
	UserID    int
	SessionID string
	Role      string
}

type MessageType string

const (
	MSG_JOIN           MessageType = "join"
	MSG_LEAVE          MessageType = "leave"
	MSG_START          MessageType = "start"
	MSG_PAUSE          MessageType = "pause"
	MSG_RESUME         MessageType = "resume"
	MSG_PHASE_CHANGE   MessageType = "phase_change"
	MSG_TIMER_SYNC     MessageType = "timer_sync"
	MSG_SUBMIT         MessageType = "submit"
	MSG_LEADERBOARD    MessageType = "leaderboard"
	MSG_ERROR          MessageType = "error"
	MSG_BRIEFING_DATA  MessageType = "briefing_data"
	MSG_STUDENT_READY  MessageType = "student_ready"
	MSG_ALL_READY      MessageType = "all_ready"
)

type WSMessage struct {
	Type    MessageType `json:"type"`
	Payload interface{} `json:"payload,omitempty"`
}

type JoinPayload struct {
	SessionID string `json:"session_id"`
	Role      string `json:"role"`
}

type SubmitPayload struct {
	SessionID   string  `json:"session_id"`
	SequenceName string  `json:"sequence_name"`
	P_geo       float64 `json:"p_geo"`
	P_ant       float64 `json:"p_ant"`
	P_param     float64 `json:"p_param"`
	TimeMs      int     `json:"time_ms"`
}

type LeaderboardPayload struct {
	SessionID  string        `json:"session_id"`
	Rankings   []StudentRank `json:"rankings"`
	Phase      Phase         `json:"phase"`
	PhaseTimer int           `json:"phase_timer"`
}

type StudentRank struct {
	UserID     int     `json:"user_id"`
	Nombre     string  `json:"nombre"`
	Score      float64 `json:"score"`
	Streak     int     `json:"streak"`
	LastResult string  `json:"last_result"`
	Submitted  bool    `json:"submitted"`
}

type PhaseChangePayload struct {
	SessionID string `json:"session_id"`
	Phase     Phase  `json:"phase"`
	Timer     int    `json:"timer"`
}

type BriefingPayload struct {
	SessionID    string `json:"session_id"`
	PatientCase  string `json:"patient_case"`
	Symptoms     string `json:"symptoms"`
	Duration     string `json:"duration"`
	ProtocolName string `json:"protocol_name"`
}

func NewHub() *Hub {
	return &Hub{
		Sessions:   make(map[string]*Session),
		Clients:    make(map[*gwebsocket.Conn]*ClientInfo),
		Register:   make(chan *ClientInfo),
		Unregister: make(chan *gwebsocket.Conn),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Mu.Lock()
			h.Clients[client.Conn] = client
			h.Mu.Unlock()

		case conn := <-h.Unregister:
			h.Mu.Lock()
			if client, ok := h.Clients[conn]; ok {
				if client.SessionID != "" {
					h.RemoveStudentFromSession(client.SessionID, client.UserID)
				}
				delete(h.Clients, conn)
				conn.Close()
			}
			h.Mu.Unlock()
		}
	}
}

func (h *Hub) CreateSession(sessionID string, teacherID int, protocolID int) *Session {
	h.Mu.Lock()
	defer h.Mu.Unlock()

	session := &Session{
		ID:         sessionID,
		TeacherID:  teacherID,
		Phase:      BRIEFING,
		Students:   make(map[int]*Student),
		ProtocolID: protocolID,
		CreatedAt:  time.Now(),
		PhaseTimer: 60,
	}
	h.Sessions[sessionID] = session
	return session
}

func (h *Hub) GetSession(sessionID string) (*Session, bool) {
	h.Mu.RLock()
	defer h.Mu.RUnlock()
	session, ok := h.Sessions[sessionID]
	return session, ok
}

func (h *Hub) AddStudentToSession(sessionID string, userID int, nombre string, conn *gwebsocket.Conn) error {
	h.Mu.RLock()
	session, ok := h.Sessions[sessionID]
	h.Mu.RUnlock()

	if !ok {
		return ErrSessionNotFound
	}

	session.Mu.Lock()
	defer session.Mu.Unlock()

	if len(session.Students) >= 30 {
		return ErrSessionFull
	}

	student := &Student{
		UserID:      userID,
		Nombre:      nombre,
		Conn:        conn,
		Score:       0,
		Streak:      0,
		IsReady:     false,
		Submissions: []Submission{},
	}
	session.Students[userID] = student
	return nil
}

func (h *Hub) RemoveStudentFromSession(sessionID string, userID int) {
	h.Mu.RLock()
	session, ok := h.Sessions[sessionID]
	h.Mu.RUnlock()

	if !ok {
		return
	}

	session.Mu.Lock()
	defer session.Mu.Unlock()
	delete(session.Students, userID)
}

func (h *Hub) SetSessionPhase(sessionID string, phase Phase, timer int) {
	h.Mu.RLock()
	session, ok := h.Sessions[sessionID]
	h.Mu.RUnlock()

	if !ok {
		return
	}

	session.Mu.Lock()
	defer session.Mu.Unlock()

	session.Phase = phase
	session.PhaseTimer = timer
	if phase == SIMULATION || phase == BRIEFING {
		session.TimerStart = time.Now()
	}
}

func (h *Hub) CalculateTimeMultiplier(timeMs int) float64 {
	seconds := timeMs / 1000

	if seconds <= 15 {
		return 1.0
	}
	if seconds <= 60 {
		return 1.0 - ((float64(seconds) - 15.0) / 45.0 * 0.5)
	}
	return 0.5
}

func (h *Hub) ProcessSubmission(userID int, sessionID string, payload SubmitPayload) (*Submission, error) {
	h.Mu.RLock()
	session, ok := h.Sessions[sessionID]
	h.Mu.RUnlock()

	if !ok {
		return nil, ErrSessionNotFound
	}

	session.Mu.Lock()
	defer session.Mu.Unlock()

	student, exists := session.Students[userID]
	if !exists {
		return nil, ErrStudentNotFound
	}

	m_tiempo := h.CalculateTimeMultiplier(payload.TimeMs)

	p_total := (0.30*payload.P_geo + 0.30*payload.P_ant + 0.40*payload.P_param) * m_tiempo

	submission := Submission{
		SequenceName: payload.SequenceName,
		P_geo:        payload.P_geo,
		P_ant:        payload.P_ant,
		P_param:      payload.P_param,
		TimeMs:       payload.TimeMs,
		M_tiempo:     m_tiempo,
		P_total:      p_total,
		SubmittedAt:  time.Now(),
	}

	student.Submissions = append(student.Submissions, submission)
	student.Score += p_total

	if p_total >= 70 {
		student.Streak++
	} else {
		student.Streak = 0
	}

	return &submission, nil
}

func (h *Hub) GetLeaderboard(sessionID string) []StudentRank {
	h.Mu.RLock()
	session, ok := h.Sessions[sessionID]
	h.Mu.RUnlock()

	if !ok {
		return []StudentRank{}
	}

	session.Mu.RLock()
	defer session.Mu.RUnlock()

	rankings := make([]StudentRank, 0, len(session.Students))
	for _, student := range session.Students {
		lastResult := "pending"
		if len(student.Submissions) > 0 {
			last := student.Submissions[len(student.Submissions)-1]
			if last.P_total >= 80 {
				lastResult = "excellent"
			} else if last.P_total >= 70 {
				lastResult = "correct"
			} else if last.P_total >= 50 {
				lastResult = "slow"
			} else {
				lastResult = "error"
			}
		}

		rankings = append(rankings, StudentRank{
			UserID:     student.UserID,
			Nombre:     student.Nombre,
			Score:      student.Score,
			Streak:     student.Streak,
			LastResult: lastResult,
			Submitted:  len(student.Submissions) > 0,
		})
	}

	for i := 0; i < len(rankings)-1; i++ {
		for j := i + 1; j < len(rankings); j++ {
			if rankings[j].Score > rankings[i].Score {
				rankings[i], rankings[j] = rankings[j], rankings[i]
			}
		}
	}

	return rankings
}

func (h *Hub) BroadcastToSession(sessionID string, msg WSMessage) {
	h.Mu.RLock()
	session, ok := h.Sessions[sessionID]
	h.Mu.RUnlock()

	if !ok {
		return
	}

	data, _ := json.Marshal(msg)

	session.Mu.RLock()
	defer session.Mu.RUnlock()

	for _, student := range session.Students {
		if student.Conn != nil {
			student.Conn.WriteMessage(gwebsocket.TextMessage, data)
		}
	}
}

func (h *Hub) CloseSession(sessionID string) {
	h.Mu.Lock()
	defer h.Mu.Unlock()

	if session, ok := h.Sessions[sessionID]; ok {
		session.Mu.Lock()
		for _, student := range session.Students {
			if student.Conn != nil {
				student.Conn.Close()
			}
		}
		session.Mu.Unlock()
	}
	delete(h.Sessions, sessionID)
}

type WSError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *WSError) Error() string {
	return e.Message
}

var (
	ErrSessionNotFound = &WSError{Code: "SESSION_NOT_FOUND", Message: "Session not found"}
	ErrSessionFull     = &WSError{Code: "SESSION_FULL", Message: "Session is full (max 30 students)"}
	ErrStudentNotFound = &WSError{Code: "STUDENT_NOT_FOUND", Message: "Student not found in session"}
	ErrUnauthorized    = &WSError{Code: "UNAUTHORIZED", Message: "Not authorized for this action"}
)