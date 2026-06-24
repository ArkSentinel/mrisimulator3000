package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/scrmhoot/mri-backend/internal/database"
	"github.com/scrmhoot/mri-backend/internal/models"
)

type PatientHandler struct{}

func NewPatientHandler() *PatientHandler {
	return &PatientHandler{}
}

func (h *PatientHandler) GetAll(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT id, nombre, fecha_nacimiento, accession, hora, created_at
		FROM pacientes ORDER BY created_at DESC
	`)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch patients",
		})
	}
	defer rows.Close()

	var patients []models.Paciente
	for rows.Next() {
		var p models.Paciente
		var fechaNac, accession, hora sql.NullString
		rows.Scan(&p.ID, &p.Nombre, &fechaNac, &accession, &hora, &p.CreatedAt)
		p.FechaNacimiento = fechaNac.String
		p.Accession = accession.String
		p.Hora = hora.String
		patients = append(patients, p)
	}

	if patients == nil {
		patients = []models.Paciente{}
	}

	return c.JSON(patients)
}

func (h *PatientHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")

	var p models.Paciente
	var fechaNac, accession, hora sql.NullString
	err := database.DB.QueryRow(`
		SELECT id, nombre, fecha_nacimiento, accession, hora, created_at
		FROM pacientes WHERE id = ?
	`, id).Scan(&p.ID, &p.Nombre, &fechaNac, &accession, &hora, &p.CreatedAt)

	if err != nil {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"error": "patient not found",
		})
	}

	p.FechaNacimiento = fechaNac.String
	p.Accession = accession.String
	p.Hora = hora.String

	return c.JSON(p)
}

func (h *PatientHandler) Create(c *fiber.Ctx) error {
	var req struct {
		Nombre          string `json:"nombre"`
		FechaNacimiento string `json:"fecha_nacimiento"`
		Accession       string `json:"accession"`
	}

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
		INSERT INTO pacientes (nombre, fecha_nacimiento, accession)
		VALUES (?, ?, ?)
	`, req.Nombre, req.FechaNacimiento, req.Accession)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to create patient",
		})
	}

	patientID, _ := result.LastInsertId()

	return c.Status(http.StatusCreated).JSON(fiber.Map{
		"id":      patientID,
		"message": "patient created successfully",
	})
}
