# Makefile for liberator-stream
# Bitcoin Live Dashboard

# Use bash and put Node 22 on the PATH for npm/node access
SHELL := /bin/bash

# Select Node 22 before each command: nvm if installed (standard or Homebrew),
# otherwise Homebrew's node@22
define load_node
	export NVM_DIR="$(HOME)/.nvm" && \
	if [ -s "/opt/homebrew/opt/nvm/libexec/nvm.sh" ]; then \
		source "/opt/homebrew/opt/nvm/libexec/nvm.sh" && nvm use 22 --silent; \
	elif [ -s "$$NVM_DIR/nvm.sh" ]; then \
		source "$$NVM_DIR/nvm.sh" && nvm use 22 --silent; \
	elif [ -x "/opt/homebrew/opt/node@22/bin/node" ]; then \
		export PATH="/opt/homebrew/opt/node@22/bin:$$PATH"; \
	else \
		echo "Node 22 not found: install nvm or run 'brew install node@22'" >&2; false; \
	fi &&
endef

.PHONY: install install-all build start dev run-dev clean lint lint-fix format test test-backend test-frontend help

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
	@echo "Utilities:"
	@echo "  clean          Remove node_modules and build artifacts"

# Installation
install:
	$(load_node) npm install
	$(load_node) cd frontend && npm install
	$(load_node) cd backend && npm install

install-all: install

# Build
build:
	$(load_node) cd frontend && npm run build

# Running
start:
	$(load_node) cd backend && npm start

dev:
	$(load_node) npm run dev

run-dev: dev

# Linting & Formatting
lint:
	$(load_node) cd backend && npm run lint
	$(load_node) cd frontend && npm run lint

lint-fix:
	$(load_node) cd backend && npm run lint -- --fix
	$(load_node) cd frontend && npm run lint:fix

format:
	$(load_node) cd backend && npm run format
	$(load_node) cd frontend && npm run format

# Testing
test: test-backend test-frontend

test-backend:
	$(load_node) cd backend && npm test

test-frontend:
	$(load_node) cd frontend && npm test -- --watchAll=false

# Cleanup
clean:
	rm -rf node_modules
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf frontend/build
