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
}

func Load() *Config {
	_ = godotenv.Load()
	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}
	return &Config{
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		JWTAccessSecret: os.Getenv("JWT_ACCESS_SECRET"),
		Port:            port,
		FrontendOrigin:  os.Getenv("FRONTEND_ORIGIN"),
	}
}
