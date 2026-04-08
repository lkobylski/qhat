.PHONY: dev dev-backend dev-frontend build build-backend build-frontend test lint clean install

# Run both backend and frontend concurrently
dev:
	@echo "Starting qhat (backend :8080 + frontend :5173)..."
	@$(MAKE) dev-backend & $(MAKE) dev-frontend & wait

dev-backend:
	@cd server && export $$(grep -v '^\s*\#' ../$(ENV_FILE) | grep -v '^\s*$$' | xargs) && go run ./cmd/server/

dev-frontend:
	cd frontend && npm run dev

# Build
build: build-backend build-frontend

build-backend:
	cd server && go build -o bin/qhat-server ./cmd/server/

build-frontend:
	cd frontend && npm run build

# Test
test:
	cd server && go build ./... && go test ./...
	cd frontend && npm run build

# Lint
lint:
	cd server && go vet ./...
	cd frontend && npm run lint

# Install dependencies
install:
	cd server && go mod tidy
	cd frontend && npm install

# Clean build artifacts
clean:
	rm -rf server/bin frontend/dist

# Config
ENV_FILE ?= .env
