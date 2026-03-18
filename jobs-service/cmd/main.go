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

	"jobboard/jobs-service/internal/config"
	"jobboard/jobs-service/internal/db"
	"jobboard/jobs-service/internal/jobs"
	"jobboard/jobs-service/internal/middleware"
	"jobboard/jobs-service/internal/repository"
	"jobboard/jobs-service/internal/scrapers"
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
	slog.Info("jobs-service: connected to database")

	if err := db.RunSchema(ctx, pool); err != nil {
		slog.Error("schema", "err", err)
		os.Exit(1)
	}
	slog.Info("jobs-service: schema ready")

	scraperCfg := scrapers.ScraperConfig{
		AdzunaAppID:  cfg.AdzunaAppID,
		AdzunaAppKey: cfg.AdzunaAppKey,
	}
	scheduler, err := scrapers.StartScheduler(pool, scraperCfg)
	if err != nil {
		slog.Error("scheduler", "err", err)
		os.Exit(1)
	}
	defer scheduler.Shutdown()

	r := gin.New()
	r.Use(middleware.RequestLogger(), gin.Recovery())

	repo := repository.NewJobRepo(pool)
	h := jobs.NewHandler(repo, scraperCfg)
	authRequired := jobs.RequireAuth(cfg)
	authOptional := jobs.OptionalAuth(cfg)

	v1 := r.Group("/jobs")
	{
		v1.GET("", authOptional, h.ListJobs)
		v1.GET("/:id", authOptional, h.GetJob)
		v1.POST("/:id/save", authRequired, h.SaveJob)
		v1.DELETE("/:id/save", authRequired, h.UnsaveJob)
	}
	r.GET("/saved-jobs", authRequired, h.ListSavedJobs)

	// Insights (public)
	r.GET("/insights/salary", h.GetSalaryInsights)
	r.GET("/insights/salary/sources", h.GetSalaryBySource)
	r.GET("/insights/salary/top", h.GetTopPayingJobs)

	// Companies (public)
	r.GET("/companies", h.ListCompanies)
	r.GET("/companies/:slug", h.GetCompanyProfile)
	r.GET("/companies/:slug/jobs", h.GetCompanyJobs)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "jobs-service"})
	})

	addr := ":" + cfg.Port
	slog.Info("jobs-service listening", "addr", addr)

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
