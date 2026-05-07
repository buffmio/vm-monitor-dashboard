package config

import (
	"errors"
	"os"
	"strconv"
	"time"
)

type Config struct {
	ServerURL string
	AgentKey  string
	Interval  time.Duration
	Location  string
}

func Load() (Config, error) {
	intervalSeconds := envInt("MONITOR_INTERVAL_SECONDS", 30)
	cfg := Config{
		ServerURL: os.Getenv("MONITOR_SERVER_URL"),
		AgentKey:  os.Getenv("MONITOR_AGENT_KEY"),
		Interval:  time.Duration(intervalSeconds) * time.Second,
		Location:  os.Getenv("MONITOR_LOCATION"),
	}
	if cfg.ServerURL == "" {
		return cfg, errors.New("MONITOR_SERVER_URL is required")
	}
	if cfg.AgentKey == "" {
		return cfg, errors.New("MONITOR_AGENT_KEY is required")
	}
	return cfg, nil
}

func envInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}
