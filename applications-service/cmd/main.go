package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"jobboard/applications-service/internal/config"
	"jobboard/applications-service/internal/db"
	"jobboard/applications-service/internal/handler"
	"jobboard/applications-service/internal/middleware"
	"jobboard/applications-service/internal/repository"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	_ = godotenv.Load()
	cfg := config.Load()

	if cfg.DatabaseURL == "" {
		slog.Error("DATABASE_URL is required")
		os.Exit(1)
	}
	if cfg.JWTAccessSecret == "" {
		slog.Error("JWT_ACCESS_SECRET is required")
		os.Exit(1)
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("db connect", "err", err)
		os.Exit(1)
	}
	defer pool.Close()
	slog.Info("applications-service: connected to database")

	if err := db.RunSchema(ctx, pool); err != nil {
		slog.Error("schema", "err", err)
		os.Exit(1)
	}
	slog.Info("applications-service: schema ready")

	r := gin.New()
	r.Use(middleware.RequestLogger(), gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.FrontendOrigin},
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	repo := repository.NewApplicationRepo(pool)
	h := handler.NewHandler(repo)
	authRequired := handler.RequireAuth(cfg)

	v1 := r.Group("/applications")
	{
		v1.GET("", authRequired, h.ListApplications)
		v1.GET("/stats", authRequired, h.GetStats)
		v1.GET("/:id", authRequired, h.GetApplication)
		v1.POST("", authRequired, h.CreateApplication)
		v1.PATCH("/:id/status", authRequired, h.UpdateStatus)
		v1.PATCH("/:id/notes", authRequired, h.UpdateNotes)
		v1.DELETE("/:id", authRequired, h.DeleteApplication)
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "applications-service"})
	})

	addr := ":" + cfg.Port
	slog.Info("applications-service listening", "addr", addr)

	srv := &http.Server{Addr: addr, Handler: r}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("shutting down...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("forced shutdown", "err", err)
	}
}
