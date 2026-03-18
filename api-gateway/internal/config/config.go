package config

import "os"

type Config struct {
	Port                   string
	AuthServiceURL         string
	JobsServiceURL         string
	ApplicationsServiceURL string
	FrontendOrigin         string
}

func Load() *Config {
	return &Config{
		Port:                   getEnv("PORT", "8080"),
		AuthServiceURL:         getEnv("AUTH_SERVICE_URL", "http://localhost:8081"),
		JobsServiceURL:         getEnv("JOBS_SERVICE_URL", "http://localhost:8082"),
		ApplicationsServiceURL: getEnv("APPLICATIONS_SERVICE_URL", "http://localhost:8083"),
		FrontendOrigin:         getEnv("FRONTEND_ORIGIN", "http://localhost:5173"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
