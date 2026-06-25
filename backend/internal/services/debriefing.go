package services

import (
	"encoding/json"

	"github.com/scrmhoot/mri-backend/internal/database"
	"github.com/scrmhoot/mri-backend/internal/models"
)

type DebriefingService struct {
	scoringService *ScoringService
}

func NewDebriefingService() *DebriefingService {
	return &DebriefingService{
		scoringService: NewScoringService(),
	}
}

func (s *DebriefingService) GenerateDebriefing(examID int, userID int) (*models.DebriefingResponse, error) {
	var estudio models.Estudio
	err := database.DB.QueryRow(`
		SELECT id, paciente_id, user_id, protocolo_id, tipo_estudio, estado, score_final
		FROM estudios WHERE id = ? AND user_id = ?
	`, examID, userID).Scan(&estudio.ID, &estudio.PacienteID, &estudio.UserID,
		&estudio.ProtocoloID, &estudio.TipoEstudio, &estudio.Estado, &estudio.ScoreFinal)
	if err != nil {
		return nil, err
	}

	results, err := s.getExamResults(examID)
	if err != nil {
		return nil, err
	}

	var totalHeatmap models.HeatmapData
	var allRecommendations []models.Recommendation
	var totalScore, planScore, centerScore, contrastScore float64

	for _, r := range results {
		totalScore += r.ScoreTotal
		planScore += r.ScorePlanificacion
		centerScore += r.ScoreCentraje
		contrastScore += r.ScoreContraste

		if r.HeatmapData != nil {
			totalHeatmap.Errors = append(totalHeatmap.Errors, r.HeatmapData.Errors...)
		}
		if r.Recomendaciones != nil {
			allRecommendations = append(allRecommendations, r.Recomendaciones...)
		}
	}

	count := float64(len(results))
	if count > 0 {
		totalScore /= count
		planScore /= count
		centerScore /= count
		contrastScore /= count
	}

	xpGained := s.calculateXPGained(totalScore)
	newLevel, leveledUp := s.updateUserProgress(userID, xpGained)
	achievements := s.CheckAchievements(userID, examID, totalScore)

	return &models.DebriefingResponse{
		ExamID: examID,
		Score: models.ScoreBreakdown{
			Total:         totalScore,
			Planificacion: planScore,
			Centraje:      centerScore,
			Contraste:     contrastScore,
		},
		Results:            results,
		TotalHeatmap:       totalHeatmap,
		AllRecommendations: deduplicateRecommendations(allRecommendations),
		XPGained:           xpGained,
		LeveledUp:          leveledUp,
		NewLevel:           newLevel,
		AchievementsEarned: achievements,
	}, nil
}

func (s *DebriefingService) getExamResults(examID int) ([]models.ExamResult, error) {
	rows, err := database.DB.Query(`
		SELECT id, estudio_id, secuencia_nombre, score_total, score_planificacion,
		score_centraje, score_contraste, snr, contraste, ruido, artifacts,
		heatmap_data, recomendaciones, errores_count, passed_count, total_checks
		FROM exam_results WHERE estudio_id = ?
	`, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.ExamResult
	for rows.Next() {
		var r models.ExamResult
		var heatmapStr, recStr []byte
		var snr, contraste, ruido, artifacts *float64

		rows.Scan(&r.ID, &r.EstudioID, &r.SecuenciaNombre, &r.ScoreTotal,
			&r.ScorePlanificacion, &r.ScoreCentraje, &r.ScoreContraste,
			&snr, &contraste, &ruido, &artifacts,
			&heatmapStr, &recStr, &r.ErroresCount, &r.PassedCount,
			&r.TotalChecks)

		if snr != nil {
			r.SNR = snr
		}
		if contraste != nil {
			r.Contraste = contraste
		}
		if ruido != nil {
			r.Ruido = ruido
		}
		if artifacts != nil {
			r.Artifacts = artifacts
		}

		if len(heatmapStr) > 0 {
			var hm models.HeatmapData
			json.Unmarshal(heatmapStr, &hm)
			r.HeatmapData = &hm
		}
		if len(recStr) > 0 {
			var recs []models.Recommendation
			json.Unmarshal(recStr, &recs)
			r.Recomendaciones = recs
		}

		results = append(results, r)
	}

	return results, nil
}

func (s *DebriefingService) calculateXPGained(score float64) int {
	baseXP := int(score)
	bonusXP := 0

	if score >= 95 {
		bonusXP = 50
	} else if score >= 85 {
		bonusXP = 25
	} else if score >= 75 {
		bonusXP = 10
	}

	return baseXP + bonusXP
}

func (s *DebriefingService) updateUserProgress(userID int, xpGained int) (int, bool) {
	var currentXP, currentLevel int
	database.DB.QueryRow(`SELECT xp_total, nivel FROM usuario_xp WHERE usuario_id = ?`, userID).Scan(&currentXP, &currentLevel)

	newXP := currentXP + xpGained
	newLevel := (newXP / 500) + 1

	leveledUp := newLevel > currentLevel

	_, err := database.DB.Exec(`
		UPDATE usuario_xp SET
		xp_total = ?,
		nivel = ?,
		examenes_totales = examenes_totales + 1,
		racha_dias = CASE
			WHEN DATE(ultimo_examen) = DATE(DATE_SUB(NOW(), INTERVAL 1 DAY)) THEN racha_dias + 1
			WHEN DATE(ultimo_examen) = CURDATE() THEN racha_dias
			ELSE 1
		END,
		ultimo_examen = CURDATE()
		WHERE usuario_id = ?
	`, newXP, newLevel, userID)
	if err != nil {
	}

	return newLevel, leveledUp
}

func (s *DebriefingService) CheckAchievements(userID int, examID int, score float64) []models.Achievement {
	var earned []models.Achievement

	var examCount int
	database.DB.QueryRow(`SELECT COUNT(*) FROM estudios WHERE user_id = ?`, userID).Scan(&examCount)

	if examCount == 1 {
		achievement := models.Achievement{
			Codigo:      "FIRST_EXAM",
			Nombre:      "Primer Examen",
			Descripcion: "Completaste tu primer examen",
			Icono:       "star",
		}
		earned = append(earned, achievement)
		s.recordAchievement(userID, "FIRST_EXAM")
	}

	if score == 100 {
		achievement := models.Achievement{
			Codigo:      "PERFECT_SCORE",
			Nombre:      "Perfección",
			Descripcion: "Obtuviste 100% en un examen",
			Icono:       "trophy",
		}
		earned = append(earned, achievement)
		s.recordAchievement(userID, "PERFECT_SCORE")
	}

	if score >= 95 {
		var t2Count int
		database.DB.QueryRow(`
			SELECT COUNT(*) FROM exam_results er
			JOIN estudios e ON er.estudio_id = e.id
			JOIN secuencias s ON er.secuencia_nombre = s.nombre_secuencia
			WHERE e.user_id = ? AND er.score_total >= 95
		`, userID).Scan(&t2Count)

		if t2Count >= 5 {
			achievement := models.Achievement{
				Codigo:      "T2_MASTER",
				Nombre:      "Maestro T2",
				Descripcion: "Obtén 95% o más en 5 exams T2",
				Icono:       "award",
			}
			earned = append(earned, achievement)
			s.recordAchievement(userID, "T2_MASTER")
		}
	}

	if examCount >= 10 {
		achievement := models.Achievement{
			Codigo:      "STUDY_STREAK",
			Nombre:      "Dedicación",
			Descripcion: "10 exámenes completados",
			Icono:       "target",
		}
		earned = append(earned, achievement)
		s.recordAchievement(userID, "STUDY_STREAK")
	}

	return earned
}

func (s *DebriefingService) recordAchievement(userID int, codigo string) {
	var logroID int
	err := database.DB.QueryRow(`SELECT id FROM logros WHERE codigo = ?`, codigo).Scan(&logroID)
	if err != nil {
		return
	}

	database.DB.Exec(`
		INSERT IGNORE INTO usuario_logros (usuario_id, logro_id) VALUES (?, ?)
	`, userID, logroID)
}

func deduplicateRecommendations(recs []models.Recommendation) []models.Recommendation {
	seen := make(map[string]bool)
	var result []models.Recommendation

	for _, rec := range recs {
		key := rec.Level + ":" + rec.Text
		if !seen[key] {
			seen[key] = true
			result = append(result, rec)
		}
	}

	return result
}

func (s *DebriefingService) GetHeatmapOverlay(examID int) (*models.HeatmapData, error) {
	rows, err := database.DB.Query(`
		SELECT heatmap_data FROM exam_results WHERE estudio_id = ?
	`, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var totalErrors []models.ErrorPoint

	for rows.Next() {
		var heatmapStr []byte
		rows.Scan(&heatmapStr)

		if len(heatmapStr) > 0 {
			var hm models.HeatmapData
			json.Unmarshal(heatmapStr, &hm)
			totalErrors = append(totalErrors, hm.Errors...)
		}
	}

	return &models.HeatmapData{Errors: totalErrors}, nil
}
