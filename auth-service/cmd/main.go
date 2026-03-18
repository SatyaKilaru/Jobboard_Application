package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"jobboard/auth-service/internal/auth"
	"jobboard/auth-service/internal/config"
	"jobboard/auth-service/internal/db"
	"jobboard/auth-service/internal/middleware"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	_ = godotenv.Load()
	cfg := config.Load()

	if cfg.DatabaseURL == "" {
		slog.Error("DATABASE_URL environment variable is required")
		os.Exit(1)
	}
	if cfg.JWTAccessSecret == "" {
		slog.Error("JWT_ACCESS_SECRET environment variable is required")
		os.Exit(1)
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "err", err)
		os.Exit(1)
	}
	defer pool.Close()
	slog.Info("auth-service: connected to database")

	if err := db.RunSchema(ctx, pool); err != nil {
		slog.Error("failed to run schema", "err", err)
		os.Exit(1)
	}
	slog.Info("auth-service: schema ready")

	engine := gin.New()
	engine.Use(middleware.RequestLogger(), gin.Recovery())

	h := auth.NewHandler(pool, cfg)
	authMiddleware := auth.RequireAuth(cfg)

	engine.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "auth-service"})
	})

	authGroup := engine.Group("/auth")
	{
		authGroup.POST("/register", h.Register)
		authGroup.POST("/login", h.Login)
		authGroup.POST("/refresh", h.Refresh)
		authGroup.POST("/logout", h.Logout)
		authGroup.GET("/me", authMiddleware, h.Me)
	}

	addr := ":" + cfg.Port
	slog.Info("auth-service listening", "addr", addr)

	srv := &http.Server{Addr: addr, Handler: engine}
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
