package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"vm-monitor-dashboard/server/internal/auth"
	"vm-monitor-dashboard/server/internal/config"
	"vm-monitor-dashboard/server/internal/httpapi"
	"vm-monitor-dashboard/server/internal/security"
	"vm-monitor-dashboard/server/internal/store"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}

	cfg := config.Load()
	ctx := context.Background()

	switch os.Args[1] {
	case "serve":
		runServe(ctx, cfg)
	case "migrate":
		runMigrate(ctx, cfg)
	case "create-admin":
		runCreateAdmin(ctx, cfg, os.Args[2:])
	default:
		usage()
		os.Exit(2)
	}
}

func runServe(ctx context.Context, cfg config.Config) {
	db := mustOpen(ctx, cfg)
	defer db.Close()

	handler := httpapi.New(cfg, db, auth.NewLDAPAuthenticator(db))
	server := &http.Server{
		Addr:         cfg.Addr,
		Handler:      handler,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
	}
	log.Printf("vm monitor api listening on %s", cfg.Addr)
	log.Fatal(server.ListenAndServe())
}

func runMigrate(ctx context.Context, cfg config.Config) {
	db := mustOpen(ctx, cfg)
	defer db.Close()

	migrations, err := filepath.Glob("../db/migrations/*.sql")
	if err != nil {
		log.Fatal(err)
	}
	if len(migrations) == 0 {
		migrations, err = filepath.Glob("db/migrations/*.sql")
		if err != nil {
			log.Fatal(err)
		}
	}
	sort.Strings(migrations)
	for _, migration := range migrations {
		body, err := os.ReadFile(migration)
		if err != nil {
			log.Fatal(err)
		}
		if err := db.Migrate(ctx, string(body)); err != nil {
			log.Fatalf("%s: %v", migration, err)
		}
		log.Printf("applied %s", migration)
	}
	fmt.Println("migrations applied")
}

func runCreateAdmin(ctx context.Context, cfg config.Config, args []string) {
	flags := flag.NewFlagSet("create-admin", flag.ExitOnError)
	username := flags.String("username", "", "admin username")
	password := flags.String("password", "", "admin password")
	_ = flags.Parse(args)

	if *username == "" {
		log.Fatal("--username is required")
	}
	if *password == "" {
		fmt.Print("Password: ")
		var entered string
		_, _ = fmt.Scanln(&entered)
		*password = strings.TrimSpace(entered)
	}
	if len(*password) < cfg.AdminPasswordMin {
		log.Fatalf("password must be at least %d characters", cfg.AdminPasswordMin)
	}

	hash, err := security.HashPassword(*password)
	if err != nil {
		log.Fatal(err)
	}
	db := mustOpen(ctx, cfg)
	defer db.Close()
	if err := db.CreateLocalUser(ctx, *username, hash); err != nil {
		log.Fatal(err)
	}
	fmt.Printf("local admin %q is ready\n", *username)
}

func mustOpen(ctx context.Context, cfg config.Config) *store.Store {
	db, err := store.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	return db
}

func usage() {
	fmt.Println("usage: server serve | migrate | create-admin --username admin [--password secret]")
}
