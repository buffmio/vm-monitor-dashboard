package main

import (
	"context"
	"log"
	"time"

	"vm-monitor-dashboard/agent/internal/client"
	"vm-monitor-dashboard/agent/internal/collector"
	"vm-monitor-dashboard/agent/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	api := client.New(cfg.ServerURL, cfg.AgentKey)
	ticker := time.NewTicker(cfg.Interval)
	defer ticker.Stop()

	for {
		sendOnce(api, cfg.Location)
		<-ticker.C
	}
}

func sendOnce(api client.Client, location string) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	snapshot, err := collector.Collect(location)
	if err != nil {
		log.Printf("collect failed: %v", err)
		return
	}
	if err := api.SendHeartbeat(ctx, snapshot); err != nil {
		log.Printf("heartbeat failed: %v", err)
		return
	}
	log.Printf("heartbeat accepted for %s", snapshot.Name)
}
