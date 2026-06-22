package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"github.com/scrmhoot/mri-backend/internal/database"
	"github.com/scrmhoot/mri-backend/internal/middleware"
	"github.com/scrmhoot/mri-backend/internal/models"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.Email == "" || req.Password == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "email and password are required",
		})
	}

	var user models.User
	err := database.DB.QueryRow(`
		SELECT id, email, password_hash, nombre, role, created_at, updated_at
		FROM users WHERE email = ?
	`, req.Email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Nombre, &user.Role,
		&user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
			"error": "invalid credentials",
		})
	}
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
			"error": "invalid credentials",
		})
	}

	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to generate token",
		})
	}

	return c.JSON(models.AuthResponse{
		Token: token,
		User:  user,
	})
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
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

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to hash password",
		})
	}

	role := req.Role
	if role == "" {
		role = "estudiante"
	}

	result, err := database.DB.Exec(`
		INSERT INTO users (email, password_hash, nombre, role)
		VALUES (?, ?, ?, ?)
	`, req.Email, string(hashedPassword), req.Nombre, role)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to create user",
		})
	}

	userID, _ := result.LastInsertId()

	database.DB.Exec(`INSERT INTO usuario_xp (usuario_id, xp_total, nivel) VALUES (?, 0, 1)`, userID)

	user := models.User{
		ID:     int(userID),
		Email:  req.Email,
		Nombre: req.Nombre,
		Role:   role,
	}

	token, _ := middleware.GenerateToken(user.ID, user.Email, user.Role)

	return c.Status(http.StatusCreated).JSON(models.AuthResponse{
		Token: token,
		User:  user,
	})
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(int)

	var user models.User
	err := database.DB.QueryRow(`
		SELECT id, email, nombre, role, created_at, updated_at
		FROM users WHERE id = ?
	`, userID).Scan(
		&user.ID, &user.Email, &user.Nombre, &user.Role,
		&user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"error": "user not found",
		})
	}

	var xp models.UserXP
	err = database.DB.QueryRow(`
		SELECT id, usuario_id, xp_total, nivel, racha_dias, ultimo_examen, examenes_totales
		FROM usuario_xp WHERE usuario_id = ?
	`, userID).Scan(
		&xp.ID, &xp.UsuarioID, &xp.XPTotal, &xp.Nivel,
		&xp.RachaDias, &xp.UltimoExamen, &xp.ExamenesTotales,
	)

	if err != nil {
		xp = models.UserXP{UsuarioID: userID, XPTotal: 0, Nivel: 1}
	}

	return c.JSON(models.UserWithXP{
		User: user,
		XP:   xp,
	})
}

func (h *AuthHandler) GetUsers(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT id, email, nombre, role, created_at, updated_at FROM users ORDER BY created_at DESC
	`)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch users",
		})
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		rows.Scan(&user.ID, &user.Email, &user.Nombre, &user.Role, &user.CreatedAt, &user.UpdatedAt)
		users = append(users, user)
	}

	return c.JSON(users)
}
