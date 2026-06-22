package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/scrmhoot/mri-backend/internal/database"
	"github.com/scrmhoot/mri-backend/internal/models"
	"github.com/scrmhoot/mri-backend/internal/services"
)

type ExamHandler struct {
	scoringService    *services.ScoringService
	debriefingService *services.DebriefingService
}

func NewExamHandler() *ExamHandler {
	return &ExamHandler{
		scoringService:    services.NewScoringService(),
		debriefingService: services.NewDebriefingService(),
	}
}

func (h *ExamHandler) Create(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(int)

	var req models.CreateExamRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.PacienteID == 0 || req.ProtocoloID == 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "paciente_id and protocolo_id are required",
		})
	}

	result, err := database.DB.Exec(`
		INSERT INTO estudios (paciente_id, user_id, protocolo_id, tipo_estudio, estado, created_at, updated_at)
		VALUES (?, ?, ?, 'planificacion', 'active', NOW(), NOW())
	`, req.PacienteID, userID, req.ProtocoloID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to create exam",
		})
	}

	estudioID, _ := result.LastInsertId()

	for _, params := range req.Params {
		_, err := database.DB.Exec(`
			INSERT INTO parametros_secuencia
			(estudio_id, secuencia_id, tr, te, ti, fov_read, fov_phase, slice_thickness, slice_gap,
			flip_angle, matrix_size, nex, phase_encoding, fat_sat, orientation)
			VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, estudioID, params.TR, params.TE, params.TI, params.FOVRead, params.FOVPhase,
			params.SliceThickness, params.SliceGap, params.FlipAngle, params.MatrixSize,
			params.NEX, params.PhaseEncoding, params.FatSat, params.Orientation)
		if err != nil {
			}
	}

	return c.Status(http.StatusCreated).JSON(fiber.Map{
		"id":      estudioID,
		"message": "exam created successfully",
	})
}

func (h *ExamHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid exam id",
		})
	}

	var estudio models.Estudio
	var scoreFinal sql.NullFloat64
	var salaID sql.NullInt64

	err = database.DB.QueryRow(`
		SELECT id, paciente_id, user_id, protocolo_id, sala_id, tipo_estudio, estado, score_final, created_at, updated_at
		FROM estudios WHERE id = ?
	`, id).Scan(&estudio.ID, &estudio.PacienteID, &estudio.UserID, &estudio.ProtocoloID,
		&salaID, &estudio.TipoEstudio, &estudio.Estado, &scoreFinal, &estudio.CreatedAt, &estudio.UpdatedAt)

	if err == sql.ErrNoRows {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"error": "exam not found",
		})
	}
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	if scoreFinal.Valid {
		estudio.ScoreFinal = &scoreFinal.Float64
	}
	if salaID.Valid {
		salaIDInt := int(salaID.Int64)
		estudio.SalaID = &salaIDInt
	}

	paramRows, _ := database.DB.Query(`
		SELECT id, estudio_id, secuencia_id, nombre_secuencia, tr, te, ti, fov_read, fov_phase,
		slice_thickness, slice_gap, flip_angle, matrix_size, nex, phase_encoding, fat_sat, orientation
		FROM parametros_secuencia WHERE estudio_id = ?
	`, id)
	defer paramRows.Close()

	var params []models.ParametrosSecuencia
	for paramRows.Next() {
		var p models.ParametrosSecuencia
		paramRows.Scan(&p.ID, &p.EstudioID, &p.SecuenciaID, &p.NombreSec, &p.TR, &p.TE, &p.TI,
			&p.FovRead, &p.FovPhase, &p.SliceThickness, &p.SliceGap, &p.FlipAngle,
			&p.MatrixSize, &p.NEX, &p.PhaseEncoding, &p.FatSat, &p.Orientation)
		params = append(params, p)
	}

	return c.JSON(fiber.Map{
		"estudio": estudio,
		"params":  params,
	})
}

func (h *ExamHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid exam id",
		})
	}

	var req models.UpdateExamRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.Estado != "" {
		_, err = database.DB.Exec(`UPDATE estudios SET estado = ?, updated_at = NOW() WHERE id = ?`,
			req.Estado, id)
	}
	if req.ScoreFinal != nil {
		_, err = database.DB.Exec(`UPDATE estudios SET score_final = ?, updated_at = NOW() WHERE id = ?`,
			*req.ScoreFinal, id)
	}

	return c.JSON(fiber.Map{
		"message": "exam updated successfully",
	})
}

func (h *ExamHandler) Evaluate(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(int)
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid exam id",
		})
	}

	var estudio models.Estudio
	err = database.DB.QueryRow(`
		SELECT id, paciente_id, user_id, protocolo_id, tipo_estudio, estado
		FROM estudios WHERE id = ? AND user_id = ?
	`, id, userID).Scan(&estudio.ID, &estudio.PacienteID, &estudio.UserID,
		&estudio.ProtocoloID, &estudio.TipoEstudio, &estudio.Estado)
	if err == sql.ErrNoRows {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"error": "exam not found",
		})
	}
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	var protocolo models.Protocol
	database.DB.QueryRow(`
		SELECT id, nombre, descripcion, anatomical_region FROM protocolos WHERE id = ?
	`, estudio.ProtocoloID).Scan(&protocolo.ID, &protocolo.Nombre, &protocolo.Descripcion, &protocolo.AnatomicalRegion)

	var sequences []models.Sequence
	seqRows, _ := database.DB.Query(`
		SELECT id, protocolo_id, nombre_secuencia, plane, tr_min, tr_max, te_min, te_max,
		fov_min, fov_max, flip_angle_min, flip_angle_max, slice_thickness_min, slice_thickness_max,
		matrix_min, matrix_max, nex_min, nex_max
		FROM secuencias WHERE protocolo_id = ?
	`, estudio.ProtocoloID)
	defer seqRows.Close()
	for seqRows.Next() {
		var s models.Sequence
		seqRows.Scan(&s.ID, &s.ProtocoloID, &s.NombreSecuencia, &s.Plane,
			&s.TRMin, &s.TRMax, &s.TEMin, &s.TEMax, &s.FOVMin, &s.FOVMax,
			&s.FlipAngleMin, &s.FlipAngleMax, &s.SliceThicknessMin, &s.SliceThicknessMax,
			&s.MatrixMin, &s.MatrixMax, &s.NEXMin, &s.NEXMax)
		sequences = append(sequences, s)
	}

	var userParams []models.ParametrosSecuencia
	paramRows, _ := database.DB.Query(`
		SELECT id, estudio_id, secuencia_id, nombre_secuencia, tr, te, ti, fov_read, fov_phase,
		slice_thickness, slice_gap, flip_angle, matrix_size, nex, phase_encoding, fat_sat, orientation
		FROM parametros_secuencia WHERE estudio_id = ?
	`, id)
	defer paramRows.Close()
	for paramRows.Next() {
		var p models.ParametrosSecuencia
		paramRows.Scan(&p.ID, &p.EstudioID, &p.SecuenciaID, &p.NombreSec, &p.TR, &p.TE, &p.TI,
			&p.FovRead, &p.FovPhase, &p.SliceThickness, &p.SliceGap, &p.FlipAngle,
			&p.MatrixSize, &p.NEX, &p.PhaseEncoding, &p.FatSat, &p.Orientation)
		userParams = append(userParams, p)
	}

	if len(userParams) == 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "no parameters to evaluate",
		})
	}

	var totalScore float64
	var planificacionScore, centrajeScore, contrastScore float64
	var allChecks []models.ParameterCheck
	var allErrors []models.ErrorPoint
	var allRecommendations []models.Recommendation

	for i, up := range userParams {
		var seq models.Sequence
		if i < len(sequences) {
			seq = sequences[i]
		}

		examParams := models.ExamParams{
			TR:            up.TR,
			TE:            up.TE,
			TI:            up.TI,
			FOVRead:       up.FovRead,
			FOVPhase:      up.FovPhase,
			SliceThickness: up.SliceThickness,
			SliceGap:      up.SliceGap,
			FlipAngle:     up.FlipAngle,
			MatrixSize:    up.MatrixSize,
			NEX:           up.NEX,
			PhaseEncoding: up.PhaseEncoding,
			FatSat:        up.FatSat,
			Orientation:   up.Orientation,
		}

		evalResult := h.scoringService.Evaluate(examParams, seq)
		totalScore += evalResult.Score.Total
		planificacionScore += evalResult.Score.Planificacion
		centrajeScore += evalResult.Score.Centraje
		contrastScore += evalResult.Score.Contraste

		allChecks = append(allChecks, evalResult.Checks...)
		allErrors = append(allErrors, evalResult.Heatmap.Errors...)
		allRecommendations = append(allRecommendations, evalResult.Recommendations...)
	}

	count := float64(len(userParams))
	if count > 0 {
		totalScore /= count
		planificacionScore /= count
		centrajeScore /= count
		contrastScore /= count
	}

	quality := h.scoringService.CalculateQualityMetrics(userParams)

	heatmapData, _ := json.Marshal(models.HeatmapData{Errors: allErrors})
	recomendationsData, _ := json.Marshal(allRecommendations)

	errorsCount := 0
	passedCount := len(allChecks)
	for _, check := range allChecks {
		if check.Status == "error" {
			errorsCount++
			passedCount--
		}
	}

	_, err = database.DB.Exec(`
		INSERT INTO exam_results
		(estudio_id, secuencia_nombre, score_total, score_planificacion, score_centraje, score_contraste,
		snr, contraste, ruido, artifacts, heatmap_data, recomendaciones, errores_count, passed_count, total_checks)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, id, "", totalScore, planificacionScore, centrajeScore, contrastScore,
		quality.SNR, quality.Contraste, quality.Ruido, quality.Artifacts,
		string(heatmapData), string(recomendationsData), errorsCount, passedCount, len(allChecks))
	if err != nil {
	}

	_, err = database.DB.Exec(`UPDATE estudios SET estado = 'completed', score_final = ?, updated_at = NOW() WHERE id = ?`,
		totalScore, id)

	xpGained := int(totalScore)
	currentLevel := 1
	currentXP := 0

	database.DB.QueryRow(`SELECT nivel FROM usuario_xp WHERE usuario_id = ?`, userID).Scan(&currentLevel)
	database.DB.QueryRow(`SELECT xp_total FROM usuario_xp WHERE usuario_id = ?`, userID).Scan(&currentXP)

	newXP := currentXP + xpGained
	newLevel := (newXP / 500) + 1

	database.DB.Exec(`
		UPDATE usuario_xp SET xp_total = ?, nivel = ?, examenes_totales = examenes_totales + 1,
		ultimo_examen = ?, racha_dias = CASE
			WHEN DATE(ultimo_examen) = DATE(DATE_SUB(NOW(), INTERVAL 1 DAY)) THEN racha_dias + 1
			WHEN DATE(ultimo_examen) = CURDATE() THEN racha_dias
			ELSE 1
		END
		WHERE usuario_id = ?
	`, newXP, newLevel, time.Now().Format("2006-01-02"), userID)

	return c.JSON(models.EvaluationResponse{
		Score: models.ScoreBreakdown{
			Total:         totalScore,
			Planificacion: planificacionScore,
			Centraje:      centrajeScore,
			Contraste:     contrastScore,
		},
		Quality:         quality,
		Heatmap:         models.HeatmapData{Errors: allErrors},
		Recommendations: allRecommendations,
		Checks:          allChecks,
	})
}

func (h *ExamHandler) GetResults(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid exam id",
		})
	}

	rows, err := database.DB.Query(`
		SELECT id, estudio_id, secuencia_nombre, score_total, score_planificacion,
		score_centraje, score_contraste, snr, contraste, ruido, artifacts,
		heatmap_data, recomendaciones, tiempo_total_segundos, errores_count,
		passed_count, total_checks, created_at
		FROM exam_results WHERE estudio_id = ?
	`, id)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch results",
		})
	}
	defer rows.Close()

	var results []models.ExamResult
	for rows.Next() {
		var r models.ExamResult
		var heatmapStr, recStr sql.NullString
		var snr, contraste, ruido, artifacts sql.NullFloat64
		var tiempo sql.NullInt64

		rows.Scan(&r.ID, &r.EstudioID, &r.SecuenciaNombre, &r.ScoreTotal,
			&r.ScorePlanificacion, &r.ScoreCentraje, &r.ScoreContraste,
			&snr, &contraste, &ruido, &artifacts,
			&heatmapStr, &recStr, &tiempo, &r.ErroresCount, &r.PassedCount,
			&r.TotalChecks, &r.CreatedAt)

		if snr.Valid {
			r.SNR = &snr.Float64
		}
		if contraste.Valid {
			r.Contraste = &contraste.Float64
		}
		if ruido.Valid {
			r.Ruido = &ruido.Float64
		}
		if artifacts.Valid {
			r.Artifacts = &artifacts.Float64
		}
		if tiempo.Valid {
			r.TiempoTotalSegundos = &tiempo.Int64
		}

		if heatmapStr.Valid {
			var hm models.HeatmapData
			json.Unmarshal([]byte(heatmapStr.String), &hm)
			r.HeatmapData = &hm
		}
		if recStr.Valid {
			var recs []models.Recommendation
			json.Unmarshal([]byte(recStr.String), &recs)
			r.Recomendaciones = recs
		}

		results = append(results, r)
	}

	if results == nil {
		results = []models.ExamResult{}
	}

	return c.JSON(results)
}

func (h *ExamHandler) GetMyExams(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(int)

	rows, err := database.DB.Query(`
		SELECT e.id, e.paciente_id, e.user_id, e.protocolo_id, e.sala_id, e.tipo_estudio,
		e.estado, e.score_final, e.created_at, e.updated_at,
		p.nombre as paciente_nombre, pr.nombre as protocolo_nombre
		FROM estudios e
		LEFT JOIN pacientes p ON e.paciente_id = p.id
		LEFT JOIN protocolos pr ON e.protocolo_id = pr.id
		WHERE e.user_id = ?
		ORDER BY e.created_at DESC
		LIMIT 50
	`, userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch exams",
		})
	}
	defer rows.Close()

	type ExamWithNames struct {
		models.Estudio
		PacienteNombre  string `json:"paciente_nombre"`
		ProtocoloNombre string `json:"protocolo_nombre"`
	}

	var exams []ExamWithNames
	for rows.Next() {
		var e ExamWithNames
		var scoreFinal sql.NullFloat64
		var salaID, pacienteID sql.NullInt64
		var pacienteNombre, protocoloNombre sql.NullString

		rows.Scan(&e.ID, &pacienteID, &e.UserID, &e.ProtocoloID, &salaID,
			&e.TipoEstudio, &e.Estado, &scoreFinal, &e.CreatedAt, &e.UpdatedAt,
			&pacienteNombre, &protocoloNombre)

		if scoreFinal.Valid {
			e.ScoreFinal = &scoreFinal.Float64
		}
		if salaID.Valid {
			salaIDInt := int(salaID.Int64)
			e.SalaID = &salaIDInt
		}
		if pacienteID.Valid {
			e.PacienteID = int(pacienteID.Int64)
		}
		e.PacienteNombre = pacienteNombre.String
		e.ProtocoloNombre = protocoloNombre.String

		exams = append(exams, e)
	}

	if exams == nil {
		exams = []ExamWithNames{}
	}

	return c.JSON(exams)
}
