package main

import (
	"errors"
	"flag"
	"fmt"
	"log"
	"strings"

	"milktea-server/pkg/config"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	var migrationPath string
	flag.StringVar(&migrationPath, "path", "migrations", "path to migration files")
	flag.Parse()

	args := flag.Args()
	if len(args) < 1 {
		log.Fatal("Command required: up or down")
	}
	command := args[0]

	cfg := config.Load()
	dbURL := cfg.DatabaseURL

	// For golang-migrate with pgx/v5, we need:
	// 1. Prefix: pgx5://
	// 2. Search path: Use x-search-path parameter instead of search_path
	if strings.HasPrefix(dbURL, "postgres://") {
		dbURL = strings.Replace(dbURL, "postgres://", "pgx5://", 1)
	} else if strings.HasPrefix(dbURL, "postgresql://") {
		dbURL = strings.Replace(dbURL, "postgresql://", "pgx5://", 1)
	}

	if strings.Contains(dbURL, "search_path=") {
		dbURL = strings.Replace(dbURL, "search_path=", "x-search-path=", 1)
	} else {
		if strings.Contains(dbURL, "?") {
			dbURL += "&x-search-path=milktea"
		} else {
			dbURL += "?x-search-path=milktea"
		}
	}

	m, err := migrate.New(
		fmt.Sprintf("file://%s", migrationPath),
		dbURL,
	)
	if err != nil {
		log.Fatal(err)
	}

	switch command {
	case "up":
		if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			log.Fatal(err)
		}
		fmt.Println("Migrations applied successfully!")
	case "down":
		if err := m.Down(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			log.Fatal(err)
		}
		fmt.Println("Migrations rolled back successfully!")
	default:
		log.Fatalf("Unknown command: %s. Use up or down", command)
	}
}
