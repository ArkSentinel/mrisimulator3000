package models

import "time"

type Protocol struct {
	ID               int       `json:"id"`
	Nombre           string    `json:"nombre"`
	Descripcion      string    `json:"descripcion"`
	AnatomicalRegion string    `json:"anatomical_region"`
	Indications      string    `json:"indications"`
	SourceURL        string    `json:"source_url"`
	CreatedAt        time.Time `json:"created_at"`
	Secuencias       []Sequence `json:"secuencias,omitempty"`
}

type Sequence struct {
	ID                 int             `json:"id"`
	ProtocoloID        int             `json:"protocolo_id"`
	NombreSecuencia   string          `json:"nombre_secuencia"`
	Plane              string          `json:"plane"`
	TRDefault          float64         `json:"tr_default"`
	TEDefault          float64         `json:"te_default"`
	FOVDefault         float64         `json:"fov_default"`
	SliceThickness     float64         `json:"slice_thickness_default"`
	TRMin              float64         `json:"tr_min"`
	TRMax              float64         `json:"tr_max"`
	TEMin              float64         `json:"te_min"`
	TEMax              float64         `json:"te_max"`
	FOVMin             float64         `json:"fov_min"`
	FOVMax             float64         `json:"fov_max"`
	FlipAngleMin       float64         `json:"flip_angle_min"`
	FlipAngleMax       float64         `json:"flip_angle_max"`
	SliceThicknessMin  float64         `json:"slice_thickness_min"`
	SliceThicknessMax  float64         `json:"slice_thickness_max"`
	MatrixMin          int             `json:"matrix_min"`
	MatrixMax          int             `json:"matrix_max"`
	NEXMin             float64         `json:"nex_min"`
	NEXMax             float64         `json:"nex_max"`
	OrientationDefault string          `json:"orientation_default"`
	FatSuppression     string          `json:"fat_suppression_default"`
	PhaseEncoding      string          `json:"phase_encoding_default"`
}

type Categoria struct {
	ID          int         `json:"id"`
	Nombre      string      `json:"nombre"`
	NombreCorto string      `json:"nombre_corto"`
	PadreID     *int        `json:"padre_id"`
	Orden       int         `json:"orden"`
	Icono       string      `json:"icono"`
	Hijos       []Categoria `json:"hijos,omitempty"`
}

type ProtocoloCategoria struct {
	ProtocoloID int  `json:"protocolo_id"`
	CategoriaID int  `json:"categoria_id"`
	EsPrimaria  bool `json:"es_primaria"`
}

type ProtocolWithSequences struct {
	Protocol
	Sequences []Sequence   `json:"sequences"`
	Categories []Categoria `json:"categories"`
}

type CategoryTree struct {
	Categoria
	Protocols []Protocol `json:"protocols,omitempty"`
}
