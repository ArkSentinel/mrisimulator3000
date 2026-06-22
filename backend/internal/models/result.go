package models

import "time"

type ScoreBreakdown struct {
	Total         float64 `json:"total"`
	Planificacion float64 `json:"planificacion"`
	Centraje      float64 `json:"centraje"`
	Contraste     float64 `json:"contraste"`
}

type QualityMetrics struct {
	SNR       float64 `json:"snr"`
	Contraste float64 `json:"contraste"`
	Ruido     float64 `json:"ruido"`
	Artifacts float64 `json:"artifacts"`
}

type ErrorPoint struct {
	Type        string      `json:"type"`
	Severity    float64     `json:"severity"`
	Position    *Position   `json:"position,omitempty"`
	Description string      `json:"description"`
}

type Position struct {
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Slice int     `json:"slice"`
}

type HeatmapData struct {
	Errors []ErrorPoint `json:"errors"`
}

type Recommendation struct {
	Level string `json:"level"`
	Text  string `json:"text"`
}

type ExamResult struct {
	ID                  int                `json:"id"`
	EstudioID           int                `json:"estudio_id"`
	SecuenciaNombre     string             `json:"secuencia_nombre"`
	ScoreTotal          float64            `json:"score_total"`
	ScorePlanificacion  float64            `json:"score_planificacion"`
	ScoreCentraje       float64            `json:"score_centraje"`
	ScoreContraste      float64            `json:"score_contraste"`
	SNR                 *float64           `json:"snr,omitempty"`
	Contraste           *float64           `json:"contraste,omitempty"`
	Ruido               *float64           `json:"ruido,omitempty"`
	Artifacts           *float64           `json:"artifacts,omitempty"`
	HeatmapData         *HeatmapData       `json:"heatmap_data,omitempty"`
	Recomendaciones     []Recommendation   `json:"recommendations,omitempty"`
	TiempoTotalSegundos  *int64             `json:"tiempo_total_segundos,omitempty"`
	ErroresCount        int                `json:"errores_count"`
	PassedCount         int                `json:"passed_count"`
	TotalChecks         int                `json:"total_checks"`
	CreatedAt           time.Time          `json:"created_at"`
}

type EvaluationResponse struct {
	Score           ScoreBreakdown  `json:"score"`
	Quality         QualityMetrics  `json:"quality"`
	Heatmap         HeatmapData     `json:"heatmap"`
	Recommendations []Recommendation `json:"recommendations"`
	Checks          []ParameterCheck `json:"checks"`
}

type ParameterCheck struct {
	Param    string `json:"param"`
	Status   string `json:"status"`
	Value    any    `json:"value"`
	Expected string `json:"expected"`
	Message  string `json:"message,omitempty"`
}

type DebriefingResponse struct {
	ExamID             int               `json:"exam_id"`
	Score              ScoreBreakdown    `json:"score"`
	Results            []ExamResult      `json:"results"`
	TotalHeatmap       HeatmapData       `json:"total_heatmap"`
	AllRecommendations []Recommendation `json:"all_recommendations"`
	XPGained           int               `json:"xp_gained"`
	LeveledUp          bool              `json:"leveled_up"`
	NewLevel           int               `json:"new_level,omitempty"`
	AchievementsEarned []Achievement     `json:"achievements_earned,omitempty"`
}

type Achievement struct {
	Codigo     string `json:"codigo"`
	Nombre     string `json:"nombre"`
	Descripcion string `json:"descripcion"`
	Icono      string `json:"icono"`
}
