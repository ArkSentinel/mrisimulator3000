package handlers

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
	"github.com/scrmhoot/mri-backend/internal/database"
)

type StatsResponse struct {
	TotalUsers      int            `json:"total_users"`
	TotalExams      int            `json:"total_exams"`
	AvgScore        float64        `json:"avg_score"`
	SessionsToday   int            `json:"sessions_today"`
	TopStudents     []StudentStats `json:"top_students"`
	RecentActivity  []ActivityItem `json:"recent_activity"`
}

type StudentStats struct {
	Nombre string  `json:"nombre"`
	Score  float64 `json:"score"`
	Exams  int     `json:"exams"`
}

type ActivityItem struct {
	User   string `json:"user"`
	Action string `json:"action"`
	Time   string `json:"time"`
}

func GetStats(c *fiber.Ctx) error {
	var totalUsers int
	err := database.DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&totalUsers)
	if err != nil {
		totalUsers = 0
	}

	var totalExams int
	err = database.DB.QueryRow("SELECT COUNT(*) FROM exam_results").Scan(&totalExams)
	if err != nil {
		totalExams = 0
	}

	var avgScore sql.NullFloat64
	database.DB.QueryRow("SELECT AVG(score) FROM exam_results WHERE score IS NOT NULL").Scan(&avgScore)
	avgScoreVal := 0.0
	if avgScore.Valid {
		avgScoreVal = avgScore.Float64
	}

	var sessionsToday int
	err = database.DB.QueryRow(`
		SELECT COUNT(*) FROM (
			SELECT created_at FROM user_sessions
			WHERE DATE(created_at) = CURDATE()
			UNION
			SELECT NOW() as created_at
		) AS today_sessions
	`).Scan(&sessionsToday)
	if err != nil {
		sessionsToday = 0
	}

	topStudents := []StudentStats{}
	rows, err := database.DB.Query(`
		SELECT u.nombre, COALESCE(AVG(er.score_total), 0) as avg_score, COUNT(er.id) as exam_count
		FROM users u
		LEFT JOIN estudios e ON u.id = e.user_id
		LEFT JOIN exam_results er ON e.id = er.estudio_id
		WHERE u.role = 'estudiante'
		GROUP BY u.id, u.nombre
		ORDER BY avg_score DESC
		LIMIT 5
	`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var s StudentStats
			if err := rows.Scan(&s.Nombre, &s.Score, &s.Exams); err == nil {
				topStudents = append(topStudents, s)
			}
		}
	}

	recentActivity := []ActivityItem{}
	activityRows, err := database.DB.Query(`
		SELECT u.nombre, 'Completed exam' as action, er.created_at
		FROM exam_results er
		JOIN estudios e ON er.estudio_id = e.id
		JOIN users u ON e.user_id = u.id
		ORDER BY er.created_at DESC
		LIMIT 5
	`)
	if err == nil {
		defer activityRows.Close()
		for activityRows.Next() {
			var a ActivityItem
			var createdAt sql.NullTime
			if err := activityRows.Scan(&a.User, &a.Action, &createdAt); err == nil {
				if createdAt.Valid {
					a.Time = createdAt.Time.Format("2006-01-02 15:04")
				}
				recentActivity = append(recentActivity, a)
			}
		}
	}

	if recentActivity == nil {
		recentActivity = []ActivityItem{}
	}
	if topStudents == nil {
		topStudents = []StudentStats{}
	}

	return c.JSON(StatsResponse{
		TotalUsers:     totalUsers,
		TotalExams:     totalExams,
		AvgScore:       avgScoreVal,
		SessionsToday:  sessionsToday,
		TopStudents:    topStudents,
		RecentActivity: recentActivity,
	})
}