package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Addr             string
	DatabaseURL      string
	SessionSecret    string
	AdminPasswordMin int
	ReadTimeout      time.Duration
	WriteTimeout     time.Duration
}

func Load() Config {
	return Config{
		Addr:             env("MONITOR_ADDR", ":8080"),
		DatabaseURL:      env("DATABASE_URL", "postgres://vm_monitor:vm_monitor@localhost:5432/vm_monitor?sslmode=disable"),
		SessionSecret:    env("MONITOR_SESSION_SECRET", "change-this-before-production"),
		AdminPasswordMin: envInt("MONITOR_ADMIN_PASSWORD_MIN", 12),
		ReadTimeout:      10 * time.Second,
		WriteTimeout:     20 * time.Second,
	}
}

func env(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func envInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
