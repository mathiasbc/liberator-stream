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

.PHONY: install install-all build start dev run-dev clean lint lint-fix format test test-backend test-frontend test-streamer help \
	stream-config services-install services-uninstall services-restart services-status logs

# Default target
help:
	@echo "liberator-stream - Bitcoin Live Dashboard"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  install        Install all dependencies (root, backend, frontend, streamer)"
	@echo "  install-all    Alias for install"
	@echo "  build          Build frontend for production"
	@echo ""
	@echo "Development:"
	@echo "  dev            Run in development mode (hot reload)"
	@echo "  run-dev        Alias for dev"
	@echo "  start          Run in production mode"
	@echo ""
	@echo "Streaming (macOS background services):"
	@echo "  stream-config      Create streamer/stream.env for the YouTube stream key"
	@echo "  services-install   Install and start the backend and streamer services"
	@echo "  services-uninstall Stop and remove both services"
	@echo "  services-restart   Restart both services"
	@echo "  services-status    Show service state and recent log lines"
	@echo "  logs               Follow both service logs"
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
	@echo "  test-streamer  Run streamer tests only"
	@echo ""
	@echo "Utilities:"
	@echo "  clean          Remove node_modules and build artifacts"

# Installation
install:
	$(load_node) npm install
	$(load_node) cd frontend && npm install
	$(load_node) cd backend && npm install
	$(load_node) cd streamer && npm install

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

# Streaming: backend and streamer as launchd services (see launchd/)
LOG_DIR := $(HOME)/Library/Logs/liberator-stream

stream-config:
	@if [ ! -f streamer/stream.env ]; then \
		cp streamer/stream.env.example streamer/stream.env && chmod 600 streamer/stream.env && \
		echo "Created streamer/stream.env: add your YouTube stream key there"; \
	fi

services-install: stream-config
	./launchd/install.sh

services-uninstall:
	./launchd/uninstall.sh

services-restart:
	launchctl kickstart -k gui/$$(id -u)/com.liberator-stream.backend
	launchctl kickstart -k gui/$$(id -u)/com.liberator-stream.streamer

services-status:
	@./launchd/status.sh

logs:
	tail -n 20 -F $(LOG_DIR)/backend.log $(LOG_DIR)/streamer.log

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
test: test-backend test-frontend test-streamer

test-backend:
	$(load_node) cd backend && npm test

test-frontend:
	$(load_node) cd frontend && npm test -- --watchAll=false

test-streamer:
	$(load_node) cd streamer && npm test

# Cleanup
clean:
	rm -rf node_modules
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf streamer/node_modules
	rm -rf streamer/.cache
	rm -rf frontend/build
