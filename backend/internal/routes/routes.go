package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/scrmhoot/mri-backend/internal/handlers"
	"github.com/scrmhoot/mri-backend/internal/middleware"
)

func Setup(app *fiber.App) {
	authHandler := handlers.NewAuthHandler()
	protocolHandler := handlers.NewProtocolReadHandler()
	adminProtocolHandler := handlers.NewAdminProtocolHandler()
	examHandler := handlers.NewExamHandler()
	patientHandler := handlers.NewPatientHandler()

	api := app.Group("/api")

	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"service": "mri-simulator-api",
		})
	})

	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)
	auth.Post("/register", authHandler.Register)
	auth.Get("/me", middleware.AuthRequired(), authHandler.Me)

	users := api.Group("/admin", middleware.AuthRequired(), middleware.RequireRole("admin"))
	users.Get("/users", authHandler.GetUsers)

	protocols := api.Group("/protocols", middleware.AuthRequired())
	protocols.Get("/", protocolHandler.GetAll)
	protocols.Get("/search", protocolHandler.Search)
	protocols.Get("/:id", protocolHandler.GetByID)
	protocols.Get("/:id/sequences", protocolHandler.GetSequences)
	protocols.Get("/category/:categoryId", protocolHandler.GetByCategory)

	categories := api.Group("/categories", middleware.AuthRequired())
	categories.Get("/", protocolHandler.GetCategories)

	adminProtocols := api.Group("/admin/protocols", middleware.AuthRequired(), middleware.RequireRole("admin"))
	adminProtocols.Get("/", adminProtocolHandler.AdminGetProtocols)
	adminProtocols.Post("/", adminProtocolHandler.AdminCreateProtocol)
	adminProtocols.Put("/:id", adminProtocolHandler.AdminUpdateProtocol)
	adminProtocols.Delete("/:id", adminProtocolHandler.AdminDeleteProtocol)
	adminProtocols.Get("/:id/sequences", adminProtocolHandler.AdminGetSequences)
	adminProtocols.Post("/sequences", adminProtocolHandler.AdminCreateSequence)
	adminProtocols.Put("/sequences/:id", adminProtocolHandler.AdminUpdateSequence)
	adminProtocols.Delete("/sequences/:id", adminProtocolHandler.AdminDeleteSequence)
	adminProtocols.Post("/sequences/:id/copy", adminProtocolHandler.CopySequenceToProtocol)

	patients := api.Group("/patients", middleware.AuthRequired())
	patients.Get("/", patientHandler.GetAll)
	patients.Get("/:id", patientHandler.GetByID)
	patients.Post("/", patientHandler.Create)

	exams := api.Group("/exams", middleware.AuthRequired())
	exams.Post("/", examHandler.Create)
	exams.Get("/my", examHandler.GetMyExams)
	exams.Get("/:id", examHandler.GetByID)
	exams.Put("/:id", examHandler.Update)
	exams.Post("/:id/evaluate", examHandler.Evaluate)
	exams.Get("/:id/results", examHandler.GetResults)

	sessions := api.Group("/sessions", middleware.AuthRequired())
	sessions.Post("/", handlers.CreateSession)
	sessions.Get("/", handlers.ListSessions)
	sessions.Get("/:id", handlers.GetSession)
	sessions.Post("/:id/join", handlers.JoinSession)
	sessions.Post("/:id/leave", handlers.LeaveSession)
	sessions.Post("/:id/start", handlers.StartSession)
	sessions.Put("/:id/phase", handlers.ChangePhase)
	sessions.Get("/:id/leaderboard", handlers.GetLeaderboard)
	sessions.Delete("/:id", handlers.CloseSession)

	adminStats := api.Group("/admin/stats", middleware.AuthRequired(), middleware.RequireRole("admin"))
	adminStats.Get("/", handlers.GetStats)
}
