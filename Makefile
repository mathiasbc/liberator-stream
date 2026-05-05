# Makefile for liberator-stream
# Bitcoin Live Dashboard

# Use bash and load nvm for npm/node access
SHELL := /bin/bash

# Load nvm before each command (supports both standard and Homebrew installations)
define load_nvm
	export NVM_DIR="$(HOME)/.nvm" && \
	if [ -s "/opt/homebrew/opt/nvm/libexec/nvm.sh" ]; then \
		source "/opt/homebrew/opt/nvm/libexec/nvm.sh"; \
	elif [ -s "$(NVM_DIR)/nvm.sh" ]; then \
		source "$(NVM_DIR)/nvm.sh"; \
	fi && nvm use 22 --silent &&
endef

.PHONY: install install-all build start dev run-dev clean lint lint-fix format test test-backend test-frontend docker-up docker-down help

# Default target
help:
	@echo "liberator-stream - Bitcoin Live Dashboard"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  install        Install all dependencies (root, backend, frontend)"
	@echo "  install-all    Alias for install"
	@echo "  build          Build frontend for production"
	@echo ""
	@echo "Development:"
	@echo "  dev            Run in development mode (hot reload)"
	@echo "  run-dev        Alias for dev"
	@echo "  start          Run in production mode"
	@echo ""
	@echo "Quality:"
	@echo "  lint           Run linters on backend and frontend"
	@echo "  lint-fix       Run linters with auto-fix"
	@echo "  format         Format code with prettier"
	@echo ""
	@echo "Testing:"
	@echo "  test           Run all tests"
	@echo "  test-backend   Run backend tests only"
	@echo "  test-frontend  Run frontend tests only"
	@echo ""
	@echo "Docker:"
	@echo "  docker-up      Start with docker-compose"
	@echo "  docker-down    Stop docker-compose services"
	@echo ""
	@echo "Utilities:"
	@echo "  clean          Remove node_modules and build artifacts"

# Installation
install:
	$(load_nvm) npm install
	$(load_nvm) cd frontend && npm install
	$(load_nvm) cd backend && npm install

install-all: install

# Build
build:
	$(load_nvm) cd frontend && npm run build

# Running
start:
	$(load_nvm) cd backend && npm start

dev:
	$(load_nvm) npm run dev

run-dev: dev

# Linting & Formatting
lint:
	$(load_nvm) cd backend && npm run lint
	$(load_nvm) cd frontend && npm run lint

lint-fix:
	$(load_nvm) cd backend && npm run lint -- --fix
	$(load_nvm) cd frontend && npm run lint:fix

format:
	$(load_nvm) cd backend && npm run format
	$(load_nvm) cd frontend && npm run format

# Testing
test: test-backend test-frontend

test-backend:
	$(load_nvm) cd backend && npm test

test-frontend:
	$(load_nvm) cd frontend && npm test -- --watchAll=false

# Docker
docker-up:
	docker-compose up --build

docker-down:
	docker-compose down

# Cleanup
clean:
	rm -rf node_modules
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf frontend/build
