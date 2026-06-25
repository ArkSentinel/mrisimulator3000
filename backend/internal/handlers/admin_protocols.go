package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/scrmhoot/mri-backend/internal/database"
	"github.com/scrmhoot/mri-backend/internal/models"
)

type AdminProtocolHandler struct{}

func NewAdminProtocolHandler() *AdminProtocolHandler {
	return &AdminProtocolHandler{}
}

type CreateProtocolRequest struct {
	Nombre           string `json:"nombre"`
	Descripcion      string `json:"descripcion"`
	AnatomicalRegion string `json:"anatomical_region"`
	Indications      string `json:"indications"`
	CategoryID       int    `json:"category_id"`
}

type UpdateProtocolRequest struct {
	Nombre           string `json:"nombre,omitempty"`
	Descripcion      string `json:"descripcion,omitempty"`
	AnatomicalRegion string `json:"anatomical_region,omitempty"`
	Indications      string `json:"indications,omitempty"`
}

type CreateSequenceRequest struct {
	ProtocoloID          int     `json:"protocolo_id"`
	NombreSecuencia     string  `json:"nombre_secuencia"`
	Plane               string  `json:"plane"`
	TRDefault           float64 `json:"tr_default"`
	TEDefault           float64 `json:"te_default"`
	FOVDefault          float64 `json:"fov_default"`
	SliceThicknessDefault float64 `json:"slice_thickness_default"`
	TRMin               float64 `json:"tr_min"`
	TRMax               float64 `json:"tr_max"`
	TEMin               float64 `json:"te_min"`
	TEMax               float64 `json:"te_max"`
	FOVMin              float64 `json:"fov_min"`
	FOVMax              float64 `json:"fov_max"`
	FlipAngleMin        float64 `json:"flip_angle_min"`
	FlipAngleMax        float64 `json:"flip_angle_max"`
	SliceThicknessMin   float64 `json:"slice_thickness_min"`
	SliceThicknessMax   float64 `json:"slice_thickness_max"`
	MatrixMin           int     `json:"matrix_min"`
	MatrixMax           int     `json:"matrix_max"`
	NEXMin              float64 `json:"nex_min"`
	NEXMax              float64 `json:"nex_max"`
	OrientationDefault   string  `json:"orientation_default"`
	FatSuppression      string  `json:"fat_suppression_default"`
	PhaseEncoding       string  `json:"phase_encoding_default"`
}

type UpdateSequenceRequest struct {
	NombreSecuencia      string  `json:"nombre_secuencia,omitempty"`
	Plane               string  `json:"plane,omitempty"`
	TRDefault           float64 `json:"tr_default,omitempty"`
	TEDefault           float64 `json:"te_default,omitempty"`
	FOVDefault          float64 `json:"fov_default,omitempty"`
	SliceThicknessDefault float64 `json:"slice_thickness_default,omitempty"`
	TRMin               float64 `json:"tr_min,omitempty"`
	TRMax               float64 `json:"tr_max,omitempty"`
	TEMin               float64 `json:"te_min,omitempty"`
	TEMax               float64 `json:"te_max,omitempty"`
	FOVMin              float64 `json:"fov_min,omitempty"`
	FOVMax              float64 `json:"fov_max,omitempty"`
	FlipAngleMin        float64 `json:"flip_angle_min,omitempty"`
	FlipAngleMax        float64 `json:"flip_angle_max,omitempty"`
	SliceThicknessMin   float64 `json:"slice_thickness_min,omitempty"`
	SliceThicknessMax   float64 `json:"slice_thickness_max,omitempty"`
	MatrixMin           int     `json:"matrix_min,omitempty"`
	MatrixMax           int     `json:"matrix_max,omitempty"`
	NEXMin              float64 `json:"nex_min,omitempty"`
	NEXMax              float64 `json:"nex_max,omitempty"`
	OrientationDefault   string  `json:"orientation_default,omitempty"`
	FatSuppression      string  `json:"fat_suppression_default,omitempty"`
	PhaseEncoding       string  `json:"phase_encoding_default,omitempty"`
}

func (h *AdminProtocolHandler) AdminGetProtocols(c *fiber.Ctx) error {
	search := c.Query("search")
	categoryID := c.Query("category_id")

	query := `
		SELECT DISTINCT p.id, p.nombre, p.descripcion, p.anatomical_region, p.indications, p.source_url
		FROM protocolos p
		INNER JOIN protocolo_categorias pc ON p.id = pc.protocolo_id
		WHERE 1=1
	`
	args := []interface{}{}

	if search != "" {
		query += " AND (p.nombre LIKE ? OR p.descripcion LIKE ? OR p.anatomical_region LIKE ?)"
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern, searchPattern)
	}

	if categoryID != "" {
		query += " AND (pc.categoria_id = ? OR pc.categoria_id IN (SELECT id FROM categorias WHERE padre_id = ?))"
		args = append(args, categoryID, categoryID)
	}

	query += " ORDER BY p.nombre ASC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch protocols",
		})
	}
	defer rows.Close()

	var protocols []models.Protocol
	for rows.Next() {
		var p models.Protocol
		var descripcion, indications, sourceURL sql.NullString
		rows.Scan(&p.ID, &p.Nombre, &descripcion, &p.AnatomicalRegion, &indications, &sourceURL)
		p.Descripcion = descripcion.String
		p.Indications = indications.String
		p.SourceURL = sourceURL.String
		protocols = append(protocols, p)
	}

	if protocols == nil {
		protocols = []models.Protocol{}
	}

	return c.JSON(protocols)
}

func (h *AdminProtocolHandler) AdminCreateProtocol(c *fiber.Ctx) error {
	var req CreateProtocolRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.Nombre == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "nombre is required",
		})
	}

	result, err := database.DB.Exec(`
		INSERT INTO protocolos (nombre, descripcion, anatomical_region, indications)
		VALUES (?, ?, ?, ?)
	`, req.Nombre, req.Descripcion, req.AnatomicalRegion, req.Indications)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to create protocol",
		})
	}

	protocolID, _ := result.LastInsertId()

	if req.CategoryID > 0 {
		database.DB.Exec(`
			INSERT INTO protocolo_categorias (protocolo_id, categoria_id, es_primaria) VALUES (?, ?, 1)
		`, protocolID, req.CategoryID)
	}

	var p models.Protocol
	database.DB.QueryRow(`
		SELECT id, nombre, descripcion, anatomical_region, indications, source_url
		FROM protocolos WHERE id = ?
	`, protocolID).Scan(&p.ID, &p.Nombre, &p.Descripcion, &p.AnatomicalRegion, &p.Indications, &p.SourceURL)

	return c.Status(http.StatusCreated).JSON(p)
}

func (h *AdminProtocolHandler) AdminUpdateProtocol(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid protocol id",
		})
	}

	var req UpdateProtocolRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	updates := []string{}
	args := []interface{}{}

	if req.Nombre != "" {
		updates = append(updates, "nombre = ?")
		args = append(args, req.Nombre)
	}
	if req.Descripcion != "" {
		updates = append(updates, "descripcion = ?")
		args = append(args, req.Descripcion)
	}
	if req.AnatomicalRegion != "" {
		updates = append(updates, "anatomical_region = ?")
		args = append(args, req.AnatomicalRegion)
	}
	if req.Indications != "" {
		updates = append(updates, "indications = ?")
		args = append(args, req.Indications)
	}

	if len(updates) == 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "no fields to update",
		})
	}

	args = append(args, id)
	query := "UPDATE protocolos SET " + joinStrings(updates, ", ") + " WHERE id = ?"

	_, err = database.DB.Exec(query, args...)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to update protocol",
		})
	}

	var p models.Protocol
	database.DB.QueryRow(`
		SELECT id, nombre, descripcion, anatomical_region, indications, source_url
		FROM protocolos WHERE id = ?
	`, id).Scan(&p.ID, &p.Nombre, &p.Descripcion, &p.AnatomicalRegion, &p.Indications, &p.SourceURL)

	return c.JSON(p)
}

func (h *AdminProtocolHandler) AdminDeleteProtocol(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid protocol id",
		})
	}

	result, err := database.DB.Exec(`DELETE FROM protocolos WHERE id = ?`, id)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to delete protocol",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"error": "protocol not found",
		})
	}

	return c.JSON(fiber.Map{
		"message": "protocol deleted successfully",
	})
}

func (h *AdminProtocolHandler) AdminGetSequences(c *fiber.Ctx) error {
	protocolID := c.Query("protocol_id")

	query := `
		SELECT id, protocolo_id, nombre_secuencia, plane,
			tr_default, te_default, fov_default, slice_thickness,
			tr_min, tr_max, te_min, te_max, fov_min, fov_max,
			flip_angle_min, flip_angle_max, slice_thickness_min, slice_thickness_max,
			matrix_min, matrix_max, nex_min, nex_max,
			orientation_default, fat_suppression_default, phase_encoding_default
		FROM secuencias WHERE 1=1
	`
	args := []interface{}{}

	if protocolID != "" {
		query += " AND protocolo_id = ?"
		args = append(args, protocolID)
	}

	query += " ORDER BY nombre_secuencia ASC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch sequences",
		})
	}
	defer rows.Close()

	var sequences []models.Sequence
	for rows.Next() {
		var s models.Sequence
		rows.Scan(&s.ID, &s.ProtocoloID, &s.NombreSecuencia, &s.Plane,
			&s.TRDefault, &s.TEDefault, &s.FOVDefault, &s.SliceThickness,
			&s.TRMin, &s.TRMax, &s.TEMin, &s.TEMax, &s.FOVMin, &s.FOVMax,
			&s.FlipAngleMin, &s.FlipAngleMax, &s.SliceThicknessMin, &s.SliceThicknessMax,
			&s.MatrixMin, &s.MatrixMax, &s.NEXMin, &s.NEXMax,
			&s.OrientationDefault, &s.FatSuppression, &s.PhaseEncoding)
		sequences = append(sequences, s)
	}

	if sequences == nil {
		sequences = []models.Sequence{}
	}

	return c.JSON(sequences)
}

func (h *AdminProtocolHandler) AdminCreateSequence(c *fiber.Ctx) error {
	var req CreateSequenceRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.NombreSecuencia == "" || req.ProtocoloID == 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "nombre_secuencia and protocolo_id are required",
		})
	}

	result, err := database.DB.Exec(`
		INSERT INTO secuencias (
			protocolo_id, nombre_secuencia, plane,
			tr_default, te_default, fov_default, slice_thickness,
			tr_min, tr_max, te_min, te_max, fov_min, fov_max,
			flip_angle_min, flip_angle_max, slice_thickness_min, slice_thickness_max,
			matrix_min, matrix_max, nex_min, nex_max,
			orientation_default, fat_suppression_default, phase_encoding_default,
			flip_default, matrix_default, averages_default
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, req.ProtocoloID, req.NombreSecuencia, req.Plane,
		req.TRDefault, req.TEDefault, req.FOVDefault, req.SliceThicknessDefault,
		req.TRMin, req.TRMax, req.TEMin, req.TEMax, req.FOVMin, req.FOVMax,
		req.FlipAngleMin, req.FlipAngleMax, req.SliceThicknessMin, req.SliceThicknessMax,
		req.MatrixMin, req.MatrixMax, req.NEXMin, req.NEXMax,
		req.OrientationDefault, req.FatSuppression, req.PhaseEncoding,
		req.FlipAngleMin, req.MatrixMin, req.NEXMin)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to create sequence",
		})
	}

	sequenceID, _ := result.LastInsertId()

	var s models.Sequence
	database.DB.QueryRow(`
		SELECT id, protocolo_id, nombre_secuencia, plane,
			tr_default, te_default, fov_default, slice_thickness,
			tr_min, tr_max, te_min, te_max, fov_min, fov_max,
			flip_angle_min, flip_angle_max, slice_thickness_min, slice_thickness_max,
			matrix_min, matrix_max, nex_min, nex_max,
			orientation_default, fat_suppression_default, phase_encoding_default
		FROM secuencias WHERE id = ?
	`, sequenceID).Scan(&s.ID, &s.ProtocoloID, &s.NombreSecuencia, &s.Plane,
		&s.TRDefault, &s.TEDefault, &s.FOVDefault, &s.SliceThickness,
		&s.TRMin, &s.TRMax, &s.TEMin, &s.TEMax, &s.FOVMin, &s.FOVMax,
		&s.FlipAngleMin, &s.FlipAngleMax, &s.SliceThicknessMin, &s.SliceThicknessMax,
		&s.MatrixMin, &s.MatrixMax, &s.NEXMin, &s.NEXMax,
		&s.OrientationDefault, &s.FatSuppression, &s.PhaseEncoding)

	return c.Status(http.StatusCreated).JSON(s)
}

func (h *AdminProtocolHandler) AdminUpdateSequence(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid sequence id",
		})
	}

	var req UpdateSequenceRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	updates := []string{}
	args := []interface{}{}

	if req.NombreSecuencia != "" {
		updates = append(updates, "nombre_secuencia = ?")
		args = append(args, req.NombreSecuencia)
	}
	if req.Plane != "" {
		updates = append(updates, "plane = ?")
		args = append(args, req.Plane)
	}
	if req.TRDefault != 0 {
		updates = append(updates, "tr_default = ?")
		args = append(args, req.TRDefault)
	}
	if req.TEDefault != 0 {
		updates = append(updates, "te_default = ?")
		args = append(args, req.TEDefault)
	}
	if req.FOVDefault != 0 {
		updates = append(updates, "fov_default = ?")
		args = append(args, req.FOVDefault)
	}
	if req.SliceThicknessDefault != 0 {
		updates = append(updates, "slice_thickness = ?")
		args = append(args, req.SliceThicknessDefault)
	}
	if req.TRMin != 0 {
		updates = append(updates, "tr_min = ?")
		args = append(args, req.TRMin)
	}
	if req.TRMax != 0 {
		updates = append(updates, "tr_max = ?")
		args = append(args, req.TRMax)
	}
	if req.TEMin != 0 {
		updates = append(updates, "te_min = ?")
		args = append(args, req.TEMin)
	}
	if req.TEMax != 0 {
		updates = append(updates, "te_max = ?")
		args = append(args, req.TEMax)
	}
	if req.FOVMin != 0 {
		updates = append(updates, "fov_min = ?")
		args = append(args, req.FOVMin)
	}
	if req.FOVMax != 0 {
		updates = append(updates, "fov_max = ?")
		args = append(args, req.FOVMax)
	}
	if req.FlipAngleMin != 0 {
		updates = append(updates, "flip_angle_min = ?")
		args = append(args, req.FlipAngleMin)
	}
	if req.FlipAngleMax != 0 {
		updates = append(updates, "flip_angle_max = ?")
		args = append(args, req.FlipAngleMax)
	}
	if req.SliceThicknessMin != 0 {
		updates = append(updates, "slice_thickness_min = ?")
		args = append(args, req.SliceThicknessMin)
	}
	if req.SliceThicknessMax != 0 {
		updates = append(updates, "slice_thickness_max = ?")
		args = append(args, req.SliceThicknessMax)
	}
	if req.MatrixMin != 0 {
		updates = append(updates, "matrix_min = ?")
		args = append(args, req.MatrixMin)
	}
	if req.MatrixMax != 0 {
		updates = append(updates, "matrix_max = ?")
		args = append(args, req.MatrixMax)
	}
	if req.NEXMin != 0 {
		updates = append(updates, "nex_min = ?")
		args = append(args, req.NEXMin)
	}
	if req.NEXMax != 0 {
		updates = append(updates, "nex_max = ?")
		args = append(args, req.NEXMax)
	}
	if req.OrientationDefault != "" {
		updates = append(updates, "orientation_default = ?")
		args = append(args, req.OrientationDefault)
	}
	if req.FatSuppression != "" {
		updates = append(updates, "fat_suppression_default = ?")
		args = append(args, req.FatSuppression)
	}
	if req.PhaseEncoding != "" {
		updates = append(updates, "phase_encoding_default = ?")
		args = append(args, req.PhaseEncoding)
	}

	if len(updates) == 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "no fields to update",
		})
	}

	args = append(args, id)
	query := "UPDATE secuencias SET " + joinStrings(updates, ", ") + " WHERE id = ?"

	_, err = database.DB.Exec(query, args...)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to update sequence",
		})
	}

	var s models.Sequence
	database.DB.QueryRow(`
		SELECT id, protocolo_id, nombre_secuencia, plane,
			tr_default, te_default, fov_default, slice_thickness_default,
			tr_min, tr_max, te_min, te_max, fov_min, fov_max,
			flip_angle_min, flip_angle_max, slice_thickness_min, slice_thickness_max,
			matrix_min, matrix_max, nex_min, nex_max,
			orientation_default, fat_suppression_default, phase_encoding_default
		FROM secuencias WHERE id = ?
	`, id).Scan(&s.ID, &s.ProtocoloID, &s.NombreSecuencia, &s.Plane,
		&s.TRDefault, &s.TEDefault, &s.FOVDefault, &s.SliceThickness,
		&s.TRMin, &s.TRMax, &s.TEMin, &s.TEMax, &s.FOVMin, &s.FOVMax,
		&s.FlipAngleMin, &s.FlipAngleMax, &s.SliceThicknessMin, &s.SliceThicknessMax,
		&s.MatrixMin, &s.MatrixMax, &s.NEXMin, &s.NEXMax,
		&s.OrientationDefault, &s.FatSuppression, &s.PhaseEncoding)

	return c.JSON(s)
}

func (h *AdminProtocolHandler) AdminDeleteSequence(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid sequence id",
		})
	}

	result, err := database.DB.Exec(`DELETE FROM secuencias WHERE id = ?`, id)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to delete sequence",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"error": "sequence not found",
		})
	}

	return c.JSON(fiber.Map{
		"message": "sequence deleted successfully",
	})
}

func (h *AdminProtocolHandler) CopySequenceToProtocol(c *fiber.Ctx) error {
	sequenceID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid sequence id",
		})
	}

	var req struct {
		TargetProtocolID int `json:"target_protocol_id"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.TargetProtocolID == 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "target_protocol_id is required",
		})
	}

	var s models.Sequence
	err = database.DB.QueryRow(`
		SELECT id, protocolo_id, nombre_secuencia, plane,
			tr_default, te_default, fov_default, slice_thickness_default,
			tr_min, tr_max, te_min, te_max, fov_min, fov_max,
			flip_angle_min, flip_angle_max, slice_thickness_min, slice_thickness_max,
			matrix_min, matrix_max, nex_min, nex_max,
			orientation_default, fat_suppression_default, phase_encoding_default
		FROM secuencias WHERE id = ?
	`, sequenceID).Scan(&s.ID, &s.ProtocoloID, &s.NombreSecuencia, &s.Plane,
		&s.TRDefault, &s.TEDefault, &s.FOVDefault, &s.SliceThickness,
		&s.TRMin, &s.TRMax, &s.TEMin, &s.TEMax, &s.FOVMin, &s.FOVMax,
		&s.FlipAngleMin, &s.FlipAngleMax, &s.SliceThicknessMin, &s.SliceThicknessMax,
		&s.MatrixMin, &s.MatrixMax, &s.NEXMin, &s.NEXMax,
		&s.OrientationDefault, &s.FatSuppression, &s.PhaseEncoding)

	if err == sql.ErrNoRows {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"error": "sequence not found",
		})
	}

	result, err := database.DB.Exec(`
		INSERT INTO secuencias (
			protocolo_id, nombre_secuencia, plane,
			tr_default, te_default, fov_default, slice_thickness_default,
			tr_min, tr_max, te_min, te_max, fov_min, fov_max,
			flip_angle_min, flip_angle_max, slice_thickness_min, slice_thickness_max,
			matrix_min, matrix_max, nex_min, nex_max,
			orientation_default, fat_suppression_default, phase_encoding_default
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, req.TargetProtocolID, s.NombreSecuencia, s.Plane,
		s.TRDefault, s.TEDefault, s.FOVDefault, s.SliceThickness,
		s.TRMin, s.TRMax, s.TEMin, s.TEMax, s.FOVMin, s.FOVMax,
		s.FlipAngleMin, s.FlipAngleMax, s.SliceThicknessMin, s.SliceThicknessMax,
		s.MatrixMin, s.MatrixMax, s.NEXMin, s.NEXMax,
		s.OrientationDefault, s.FatSuppression, s.PhaseEncoding)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to copy sequence",
		})
	}

	newID, _ := result.LastInsertId()

	var newSeq models.Sequence
	database.DB.QueryRow(`
		SELECT id, protocolo_id, nombre_secuencia, plane,
			tr_default, te_default, fov_default, slice_thickness_default,
			tr_min, tr_max, te_min, te_max, fov_min, fov_max,
			flip_angle_min, flip_angle_max, slice_thickness_min, slice_thickness_max,
			matrix_min, matrix_max, nex_min, nex_max,
			orientation_default, fat_suppression_default, phase_encoding_default
		FROM secuencias WHERE id = ?
	`, newID).Scan(&newSeq.ID, &newSeq.ProtocoloID, &newSeq.NombreSecuencia, &newSeq.Plane,
		&newSeq.TRDefault, &newSeq.TEDefault, &newSeq.FOVDefault, &newSeq.SliceThickness,
		&newSeq.TRMin, &newSeq.TRMax, &newSeq.TEMin, &newSeq.TEMax, &newSeq.FOVMin, &newSeq.FOVMax,
		&newSeq.FlipAngleMin, &newSeq.FlipAngleMax, &newSeq.SliceThicknessMin, &newSeq.SliceThicknessMax,
		&newSeq.MatrixMin, &newSeq.MatrixMax, &newSeq.NEXMin, &newSeq.NEXMax,
		&newSeq.OrientationDefault, &newSeq.FatSuppression, &newSeq.PhaseEncoding)

	return c.Status(http.StatusCreated).JSON(newSeq)
}

func (h *AdminProtocolHandler) AdminGetCategories(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT id, nombre, nombre_corto, padre_id, orden, icono FROM categorias ORDER BY orden, nombre
	`)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch categories",
		})
	}
	defer rows.Close()

	var categories []models.Categoria
	for rows.Next() {
		var cat models.Categoria
		rows.Scan(&cat.ID, &cat.Nombre, &cat.NombreCorto, &cat.PadreID, &cat.Orden, &cat.Icono)
		categories = append(categories, cat)
	}

	if categories == nil {
		categories = []models.Categoria{}
	}

	return c.JSON(categories)
}

func (h *AdminProtocolHandler) AdminCreateCategory(c *fiber.Ctx) error {
	var req struct {
		Nombre      string `json:"nombre"`
		NombreCorto string `json:"nombre_corto"`
		Icono       string `json:"icono"`
		Orden       int    `json:"orden"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	if req.Nombre == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "nombre is required"})
	}

	result, err := database.DB.Exec(`
		INSERT INTO categorias (nombre, nombre_corto, icono, orden) VALUES (?, ?, ?, ?)
	`, req.Nombre, req.NombreCorto, req.Icono, req.Orden)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create category"})
	}

	id, _ := result.LastInsertId()
	var cat models.Categoria
	database.DB.QueryRow(`
		SELECT id, nombre, nombre_corto, padre_id, orden, icono FROM categorias WHERE id = ?
	`, id).Scan(&cat.ID, &cat.Nombre, &cat.NombreCorto, &cat.PadreID, &cat.Orden, &cat.Icono)

	return c.Status(http.StatusCreated).JSON(cat)
}

func (h *AdminProtocolHandler) AdminUpdateCategory(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	var req struct {
		Nombre      string `json:"nombre"`
		NombreCorto string `json:"nombre_corto"`
		Icono       string `json:"icono"`
		Orden       int    `json:"orden"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	updates := []string{}
	args := []interface{}{}

	if req.Nombre != "" {
		updates = append(updates, "nombre = ?")
		args = append(args, req.Nombre)
	}
	if req.NombreCorto != "" {
		updates = append(updates, "nombre_corto = ?")
		args = append(args, req.NombreCorto)
	}
	if req.Icono != "" {
		updates = append(updates, "icono = ?")
		args = append(args, req.Icono)
	}
	if req.Orden != 0 {
		updates = append(updates, "orden = ?")
		args = append(args, req.Orden)
	}

	if len(updates) == 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "no fields to update"})
	}

	args = append(args, id)
	query := "UPDATE categorias SET " + joinStrings(updates, ", ") + " WHERE id = ?"

	_, err = database.DB.Exec(query, args...)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update category"})
	}

	var cat models.Categoria
	database.DB.QueryRow(`
		SELECT id, nombre, nombre_corto, padre_id, orden, icono FROM categorias WHERE id = ?
	`, id).Scan(&cat.ID, &cat.Nombre, &cat.NombreCorto, &cat.PadreID, &cat.Orden, &cat.Icono)

	return c.JSON(cat)
}

func (h *AdminProtocolHandler) AdminDeleteCategory(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	_, err = database.DB.Exec("DELETE FROM categorias WHERE id = ?", id)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete category"})
	}

	return c.JSON(fiber.Map{"message": "category deleted"})
}
