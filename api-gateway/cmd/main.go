package main

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"jobboard/api-gateway/internal/config"
	"jobboard/api-gateway/internal/middleware"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	// Load .env file if present
	_ = godotenv.Load()

	cfg := config.Load()

	engine := gin.New()
	engine.Use(middleware.RequestLogger())
	engine.Use(gin.Recovery())
	engine.Use(middleware.RequestID())

	// CORS — allow credentials so refresh token cookie flows through
	corsConfig := cors.Config{
		AllowOrigins:     []string{cfg.FrontendOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}
	engine.Use(cors.New(corsConfig))

	// Health check
	engine.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "api-gateway"})
	})

	// Route /api/v1/auth/* → auth-service (strip /api/v1 prefix)
	engine.Any("/api/v1/auth/*path", proxyTo(cfg.AuthServiceURL))

	// Route /api/v1/jobs → jobs-service (exact + wildcard)
	engine.Any("/api/v1/jobs", proxyTo(cfg.JobsServiceURL))
	engine.Any("/api/v1/jobs/*path", proxyTo(cfg.JobsServiceURL))

	// Route /api/v1/saved-jobs/* → jobs-service (strip /api/v1 prefix)
	engine.Any("/api/v1/saved-jobs", proxyTo(cfg.JobsServiceURL))
	engine.Any("/api/v1/saved-jobs/*path", proxyTo(cfg.JobsServiceURL))

	// Route /api/v1/insights/* → jobs-service
	engine.Any("/api/v1/insights/*path", proxyTo(cfg.JobsServiceURL))

	// Route /api/v1/companies/* → jobs-service
	engine.Any("/api/v1/companies", proxyTo(cfg.JobsServiceURL))
	engine.Any("/api/v1/companies/*path", proxyTo(cfg.JobsServiceURL))

	// Route /api/v1/applications/* → applications-service
	appServiceURL := cfg.ApplicationsServiceURL
	engine.Any("/api/v1/applications", proxyTo(appServiceURL))
	engine.Any("/api/v1/applications/*path", proxyTo(appServiceURL))

	addr := ":" + cfg.Port
	slog.Info("api-gateway listening", "addr", addr)

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

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("forced shutdown", "err", err)
	}
}

// proxyTo creates a Gin handler that reverse-proxies requests to the given target URL.
// It strips the /api/v1 prefix from the request path before forwarding.
func proxyTo(target string) gin.HandlerFunc {
	u, err := url.Parse(target)
	if err != nil {
		slog.Error("invalid proxy target URL", "target", target, "err", err)
		os.Exit(1)
	}
	proxy := httputil.NewSingleHostReverseProxy(u)
	return func(c *gin.Context) {
		// Strip /api/v1 prefix from the path before proxying
		c.Request.URL.Path = strings.TrimPrefix(c.Request.URL.Path, "/api/v1")
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}
