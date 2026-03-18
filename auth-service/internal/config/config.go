package config

import (
	"os"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	DatabaseURL     string
	JWTAccessSecret string
	JWTRefreshSecret string
	Port            string
	FrontendOrigin  string
	Env             string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	return &Config{
		DatabaseURL:      os.Getenv("DATABASE_URL"),
		JWTAccessSecret:  os.Getenv("JWT_ACCESS_SECRET"),
		JWTRefreshSecret: os.Getenv("JWT_REFRESH_SECRET"),
		Port:             port,
		FrontendOrigin:   os.Getenv("FRONTEND_ORIGIN"),
		Env:              os.Getenv("ENV"),
	}
}

// IsProduction returns true when running in production environment.
func (c *Config) IsProduction() bool {
	return c.Env == "production"
}
