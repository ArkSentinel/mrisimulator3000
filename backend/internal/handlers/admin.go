package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/scrmhoot/mri-backend/internal/database"
	"github.com/scrmhoot/mri-backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

type AdminHandler struct{}

func NewAdminHandler() *AdminHandler {
	return &AdminHandler{}
}

type CreateUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Nombre   string `json:"nombre"`
	Role     string `json:"role"`
}

type UpdateUserRequest struct {
	Email    string `json:"email,omitempty"`
	Nombre   string `json:"nombre,omitempty"`
	Role     string `json:"role,omitempty"`
}

func (h *AdminHandler) GetUsers(c *fiber.Ctx) error {
	roleFilter := c.Query("role")
	search := c.Query("search")

	query := `SELECT id, email, nombre, role, created_at, updated_at FROM users WHERE 1=1`
	args := []interface{}{}

	if roleFilter != "" {
		query += " AND role = ?"
		args = append(args, roleFilter)
	}

	if search != "" {
		query += " AND (email LIKE ? OR nombre LIKE ?)"
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern)
	}

	query += " ORDER BY created_at DESC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch users",
		})
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		rows.Scan(&u.ID, &u.Email, &u.Nombre, &u.Role, &u.CreatedAt, &u.UpdatedAt)
		users = append(users, u)
	}

	if users == nil {
		users = []models.User{}
	}

	return c.JSON(users)
}

func (h *AdminHandler) GetUser(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid user id",
		})
	}

	var u models.User
	err = database.DB.QueryRow(`
		SELECT id, email, nombre, role, created_at, updated_at
		FROM users WHERE id = ?
	`, id).Scan(&u.ID, &u.Email, &u.Nombre, &u.Role, &u.CreatedAt, &u.UpdatedAt)

	if err == sql.ErrNoRows {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"error": "user not found",
		})
	}
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	return c.JSON(u)
}

func (h *AdminHandler) CreateUser(c *fiber.Ctx) error {
	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.Email == "" || req.Password == "" || req.Nombre == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "email, password, and nombre are required",
		})
	}

	if req.Role == "" {
		req.Role = "estudiante"
	}

	if req.Role != "admin" && req.Role != "docente" && req.Role != "estudiante" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid role",
		})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to hash password",
		})
	}

	result, err := database.DB.Exec(`
		INSERT INTO users (email, password_hash, nombre, role)
		VALUES (?, ?, ?, ?)
	`, req.Email, string(hashedPassword), req.Nombre, req.Role)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to create user or email already exists",
		})
	}

	userID, _ := result.LastInsertId()

	database.DB.Exec(`INSERT INTO usuario_xp (usuario_id, xp_total, nivel) VALUES (?, 0, 1)`, userID)

	var user models.User
	database.DB.QueryRow(`
		SELECT id, email, nombre, role, created_at, updated_at FROM users WHERE id = ?
	`, userID).Scan(&user.ID, &user.Email, &user.Nombre, &user.Role, &user.CreatedAt, &user.UpdatedAt)

	return c.Status(http.StatusCreated).JSON(user)
}

func (h *AdminHandler) UpdateUser(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid user id",
		})
	}

	var req UpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	updates := []string{}
	args := []interface{}{}

	if req.Email != "" {
		updates = append(updates, "email = ?")
		args = append(args, req.Email)
	}
	if req.Nombre != "" {
		updates = append(updates, "nombre = ?")
		args = append(args, req.Nombre)
	}
	if req.Role != "" {
		if req.Role != "admin" && req.Role != "docente" && req.Role != "estudiante" {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid role",
			})
		}
		updates = append(updates, "role = ?")
		args = append(args, req.Role)
	}

	if len(updates) == 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "no fields to update",
		})
	}

	args = append(args, id)
	query := "UPDATE users SET " + joinStrings(updates, ", ") + " WHERE id = ?"

	_, err = database.DB.Exec(query, args...)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to update user",
		})
	}

	var user models.User
	database.DB.QueryRow(`
		SELECT id, email, nombre, role, created_at, updated_at FROM users WHERE id = ?
	`, id).Scan(&user.ID, &user.Email, &user.Nombre, &user.Role, &user.CreatedAt, &user.UpdatedAt)

	return c.JSON(user)
}

func (h *AdminHandler) DeleteUser(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid user id",
		})
	}

	if id == 1 {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{
			"error": "cannot delete the main admin user",
		})
	}

	result, err := database.DB.Exec(`DELETE FROM users WHERE id = ?`, id)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to delete user",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"error": "user not found",
		})
	}

	return c.JSON(fiber.Map{
		"message": "user deleted successfully",
	})
}

func (h *AdminHandler) GetStudents(c *fiber.Ctx) error {
	teacherID := c.Query("teacher_id")

	query := `
		SELECT u.id, u.email, u.nombre, u.role, u.created_at,
			COALESCE(ux.xp_total, 0) as xp_total,
			COALESCE(ux.nivel, 1) as nivel,
			COALESCE(ux.examenes_totales, 0) as examenes_totales
		FROM users u
		LEFT JOIN usuario_xp ux ON u.id = ux.usuario_id
		WHERE u.role = 'estudiante'
	`

	args := []interface{}{}

	if teacherID != "" {
		query += ` AND EXISTS (
			SELECT 1 FROM sala_participantes sp
			JOIN salas s ON sp.sala_id = s.id
			WHERE sp.usuario_id = u.id AND s.docente_id = ?
		)`
		args = append(args, teacherID)
	}

	query += " ORDER BY u.nombre ASC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch students",
		})
	}
	defer rows.Close()

	type StudentWithStats struct {
		models.User
		XPTotal         int `json:"xp_total"`
		Nivel           int `json:"nivel"`
		ExamenesTotales int `json:"examenes_totales"`
	}

	var students []StudentWithStats
	for rows.Next() {
		var s StudentWithStats
		rows.Scan(&s.ID, &s.Email, &s.Nombre, &s.Role, &s.CreatedAt, &s.XPTotal, &s.Nivel, &s.ExamenesTotales)
		students = append(students, s)
	}

	if students == nil {
		students = []StudentWithStats{}
	}

	return c.JSON(students)
}

func (h *AdminHandler) GetTeachers(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT id, email, nombre, role, created_at, updated_at
		FROM users WHERE role = 'docente'
		ORDER BY nombre ASC
	`)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch teachers",
		})
	}
	defer rows.Close()

	var teachers []models.User
	for rows.Next() {
		var t models.User
		rows.Scan(&t.ID, &t.Email, &t.Nombre, &t.Role, &t.CreatedAt, &t.UpdatedAt)
		teachers = append(teachers, t)
	}

	if teachers == nil {
		teachers = []models.User{}
	}

	return c.JSON(teachers)
}

func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}
