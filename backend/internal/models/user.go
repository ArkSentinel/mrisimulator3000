package models

import "time"

type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Nombre       string    `json:"nombre"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type UserXP struct {
	ID              int     `json:"id"`
	UsuarioID       int     `json:"usuario_id"`
	XPTotal         int     `json:"xp_total"`
	Nivel           int     `json:"nivel"`
	RachaDias       int     `json:"racha_dias"`
	UltimoExamen    *string `json:"ultimo_examen"`
	ExamenesTotales int     `json:"examenes_totales"`
}

type UserWithXP struct {
	User
	XP UserXP `json:"xp"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Nombre   string `json:"nombre"`
	Role     string `json:"role"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}
