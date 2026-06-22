package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/scrmhoot/mri-backend/internal/database"
	"github.com/scrmhoot/mri-backend/internal/models"
)

type ProtocolReadHandler struct{}

func NewProtocolReadHandler() *ProtocolReadHandler {
	return &ProtocolReadHandler{}
}

func (h *ProtocolReadHandler) GetAll(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT id, nombre, descripcion, anatomical_region, indications, source_url, created_at
		FROM protocolos ORDER BY nombre
	`)
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
		rows.Scan(&p.ID, &p.Nombre, &descripcion, &p.AnatomicalRegion,
			&indications, &sourceURL, &p.CreatedAt)
		p.Descripcion = descripcion.String
		p.Indications = indications.String
		p.SourceURL = sourceURL.String
		protocols = append(protocols, p)
	}

	return c.JSON(protocols)
}

func (h *ProtocolReadHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid protocol id",
		})
	}

	var p models.Protocol
	var descripcion, indications, sourceURL sql.NullString
	err = database.DB.QueryRow(`
		SELECT id, nombre, descripcion, anatomical_region, indications, source_url, created_at
		FROM protocolos WHERE id = ?
	`, id).Scan(&p.ID, &p.Nombre, &descripcion, &p.AnatomicalRegion,
		&indications, &sourceURL, &p.CreatedAt)

	if err == sql.ErrNoRows {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"error": "protocol not found",
		})
	}
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	p.Descripcion = descripcion.String
	p.Indications = indications.String
	p.SourceURL = sourceURL.String

	seqRows, err := database.DB.Query(`
		SELECT id, protocolo_id, nombre_secuencia, plane,
			tr_default, te_default, fov_default, slice_thickness_default,
			tr_min, tr_max, te_min, te_max, fov_min, fov_max,
			flip_angle_min, flip_angle_max, slice_thickness_min, slice_thickness_max,
			matrix_min, matrix_max, nex_min, nex_max,
			orientation_default, fat_suppression_default, phase_encoding_default, technical_parameters
		FROM secuencias WHERE protocolo_id = ?
	`, id)
	if err == nil {
		defer seqRows.Close()
		for seqRows.Next() {
			var s models.Sequence
			seqRows.Scan(&s.ID, &s.ProtocoloID, &s.NombreSecuencia, &s.Plane,
				&s.TRDefault, &s.TEDefault, &s.FOVDefault, &s.SliceThickness,
				&s.TRMin, &s.TRMax, &s.TEMin, &s.TEMax, &s.FOVMin, &s.FOVMax,
				&s.FlipAngleMin, &s.FlipAngleMax, &s.SliceThicknessMin, &s.SliceThicknessMax,
				&s.MatrixMin, &s.MatrixMax, &s.NEXMin, &s.NEXMax,
				&s.OrientationDefault, &s.FatSuppression, &s.PhaseEncoding, &s.TechnicalParams)
			p.Indications = s.NombreSecuencia
		}
	}

	catRows, err := database.DB.Query(`
		SELECT c.id, c.nombre, c.nombre_corto, c.padre_id, c.orden, c.icono
		FROM categorias c
		JOIN protocolo_categorias pc ON c.id = pc.categoria_id
		WHERE pc.protocolo_id = ?
	`, id)
	if err == nil {
		defer catRows.Close()
		for catRows.Next() {
			var cat models.Categoria
			catRows.Scan(&cat.ID, &cat.Nombre, &cat.NombreCorto, &cat.PadreID, &cat.Orden, &cat.Icono)
		}
	}

	return c.JSON(p)
}

func (h *ProtocolReadHandler) GetSequences(c *fiber.Ctx) error {
	protocolID, err := strconv.Atoi(c.Query("protocol_id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "protocol_id is required",
		})
	}

	rows, err := database.DB.Query(`
		SELECT id, protocolo_id, nombre_secuencia, plane,
			tr_default, te_default, fov_default, slice_thickness_default,
			tr_min, tr_max, te_min, te_max, fov_min, fov_max,
			flip_angle_min, flip_angle_max, slice_thickness_min, slice_thickness_max,
			matrix_min, matrix_max, nex_min, nex_max,
			orientation_default, fat_suppression_default, phase_encoding_default
		FROM secuencias WHERE protocolo_id = ?
	`, protocolID)
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

	return c.JSON(sequences)
}

func (h *ProtocolReadHandler) GetCategories(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT id, nombre, nombre_corto, padre_id, orden, icono FROM categorias ORDER BY orden, nombre
	`)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch categories",
		})
	}
	defer rows.Close()

	var allCategories []models.Categoria
	categoryMap := make(map[int]*models.Categoria)

	for rows.Next() {
		var cat models.Categoria
		rows.Scan(&cat.ID, &cat.Nombre, &cat.NombreCorto, &cat.PadreID, &cat.Orden, &cat.Icono)
		cat.Hijos = []models.Categoria{}
		allCategories = append(allCategories, cat)
		categoryMap[cat.ID] = &allCategories[len(allCategories)-1]
	}

	var tree []models.Categoria
	for i := range allCategories {
		cat := &allCategories[i]
		if cat.PadreID == nil {
			tree = append(tree, *cat)
		} else {
			if parent, ok := categoryMap[*cat.PadreID]; ok {
				parent.Hijos = append(parent.Hijos, *cat)
			}
		}
	}

	if tree == nil {
		tree = []models.Categoria{}
	}

	return c.JSON(tree)
}

func (h *ProtocolReadHandler) GetByCategory(c *fiber.Ctx) error {
	categoryID, err := strconv.Atoi(c.Params("categoryId"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid category id",
		})
	}

	rows, err := database.DB.Query(`
		SELECT DISTINCT p.id, p.nombre, p.descripcion, p.anatomical_region, p.indications, p.source_url
		FROM protocolos p
		JOIN protocolo_categorias pc ON p.id = pc.protocolo_id
		WHERE pc.categoria_id = ? OR pc.categoria_id IN (
			SELECT id FROM categorias WHERE padre_id = ?
		)
	`, categoryID, categoryID)
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

func (h *ProtocolReadHandler) Search(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "search query is required",
		})
	}

	searchPattern := "%" + query + "%"
	rows, err := database.DB.Query(`
		SELECT id, nombre, descripcion, anatomical_region, indications, source_url
		FROM protocolos
		WHERE nombre LIKE ? OR descripcion LIKE ? OR anatomical_region LIKE ? OR indications LIKE ?
		LIMIT 50
	`, searchPattern, searchPattern, searchPattern, searchPattern)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "search failed",
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
