.PHONY: up down build logs-server logs-client

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs-server:
	docker compose logs -f server

logs-client:
	docker compose logs -f client

migrate-up:
	# Lệnh chạy migration cho Go
	cd server && go run cmd/migrate/main.go up
