package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	Port           string
	DeepLAPIKey    string
	DeepLAPIURL    string
	TURNHost       string
	TURNPort       int
	TURNUsername   string
	TURNPassword   string
	AllowedOrigins []string
	Env            string
}

// LoadFromEnv reads configuration from environment variables with sensible defaults.
func LoadFromEnv() (*Config, error) {
	cfg := &Config{
		Port:        getEnv("PORT", "8080"),
		DeepLAPIKey: os.Getenv("DEEPL_API_KEY"),
		DeepLAPIURL: getEnv("DEEPL_API_URL", "https://api-free.deepl.com/v2"),
		TURNHost:    os.Getenv("TURN_HOST"),
		TURNUsername: os.Getenv("TURN_USERNAME"),
		TURNPassword: os.Getenv("TURN_PASSWORD"),
		Env:         getEnv("APP_ENV", "development"),
	}

	turnPort := getEnv("TURN_PORT", "3478")
	port, err := strconv.Atoi(turnPort)
	if err != nil {
		return nil, fmt.Errorf("invalid TURN_PORT %q: %w", turnPort, err)
	}
	cfg.TURNPort = port

	origins := getEnv("ALLOWED_ORIGINS", "http://localhost:5173")
	cfg.AllowedOrigins = strings.Split(origins, ",")
	for i, o := range cfg.AllowedOrigins {
		cfg.AllowedOrigins[i] = strings.TrimSpace(o)
	}

	return cfg, nil
}

// IsDevelopment returns true when running in development mode.
func (c *Config) IsDevelopment() bool {
	return c.Env == "development"
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
