package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL     string
	JWTAccessSecret string
	Port            string
	FrontendOrigin  string
	Env             string
	AdzunaAppID     string
	AdzunaAppKey    string
}

func Load() *Config {
	_ = godotenv.Load()
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	return &Config{
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		JWTAccessSecret: os.Getenv("JWT_ACCESS_SECRET"),
		Port:            port,
		FrontendOrigin:  getEnv("FRONTEND_ORIGIN", "*"),
		Env:             os.Getenv("ENV"),
		AdzunaAppID:     os.Getenv("ADZUNA_APP_ID"),
		AdzunaAppKey:    os.Getenv("ADZUNA_APP_KEY"),
	}
}

func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
