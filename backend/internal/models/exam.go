package models

import "time"

type ExamStatus string

const (
	ExamStatusPending   ExamStatus = "pending"
	ExamStatusActive    ExamStatus = "active"
	ExamStatusCompleted ExamStatus = "completed"
	ExamStatusCancelled ExamStatus = "cancelled"
)

type Estudio struct {
	ID           int         `json:"id"`
	PacienteID   int         `json:"paciente_id"`
	UserID       int         `json:"user_id"`
	ProtocoloID  int         `json:"protocolo_id"`
	SalaID       *int        `json:"sala_id"`
	TipoEstudio  string      `json:"tipo_estudio"`
	Estado       ExamStatus  `json:"estado"`
	ScoreFinal   *float64    `json:"score_final"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

type Paciente struct {
	ID             int       `json:"id"`
	Nombre         string    `json:"nombre"`
	FechaNacimiento string   `json:"fecha_nacimiento"`
	Accession      string    `json:"accession"`
	Hora           string    `json:"hora"`
	CreatedAt      time.Time `json:"created_at"`
}


type ParametrosSecuencia struct {
	ID            int     `json:"id"`
	EstudioID     int     `json:"estudio_id"`
	SecuenciaID   int     `json:"secuencia_id"`
	NombreSec     string  `json:"nombre_secuencia"`
	TR            float64 `json:"tr"`
	TE            float64 `json:"te"`
	TI            float64 `json:"ti"`
	FovRead       float64 `json:"fov_read"`
	FovPhase      float64 `json:"fov_phase"`
	SliceThickness float64 `json:"slice_thickness"`
	SliceGap      float64 `json:"slice_gap"`
	FlipAngle     float64 `json:"flip_angle"`
	MatrixSize    int     `json:"matrix_size"`
	NEX           float64 `json:"nex"`
	PhaseEncoding string  `json:"phase_encoding"`
	FatSat        bool    `json:"fat_sat"`
	Orientation   string  `json:"orientation"`
}

type ExamParams struct {
	TR            float64 `json:"tr"`
	TE            float64 `json:"te"`
	TI            float64 `json:"ti"`
	FOVRead       float64 `json:"fov_read"`
	FOVPhase      float64 `json:"fov_phase"`
	SliceThickness float64 `json:"slice_thickness"`
	SliceGap      float64 `json:"slice_gap"`
	FlipAngle     float64 `json:"flip_angle"`
	MatrixSize    int     `json:"matrix_size"`
	NEX           float64 `json:"nex"`
	PhaseEncoding string  `json:"phase_encoding"`
	FatSat        bool    `json:"fat_sat"`
	Orientation   string  `json:"orientation"`
	IsocenterX    float64 `json:"isocenter_x"`
	IsocenterY    float64 `json:"isocenter_y"`
	IsocenterZ    float64 `json:"isocenter_z"`
}

type CreateExamRequest struct {
	PacienteID  int   `json:"paciente_id"`
	ProtocoloID int   `json:"protocolo_id"`
	Params      []ExamParams `json:"params"`
}

type UpdateExamRequest struct {
	Estado     ExamStatus  `json:"estado,omitempty"`
	ScoreFinal *float64    `json:"score_final,omitempty"`
}
