# Liberator Stream Backend

A real-time data streaming backend service built with Koa.js and WebSocket support.

## Current Status

⚠️ **This project is in active development and subject to frequent changes.**

## Features

- WebSocket server for real-time data streaming
- Scheduled data updates and synchronization
- Health monitoring endpoint
- Dockerized deployment ready

## Tech Stack

- **Backend**: Koa.js + WebSocket
- **Data Services**: CoinGecko & Blockchain.info APIs
- **Containerization**: Docker

## Quick Start

```bash
# Install dependencies
cd backend
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm start

# Or use Docker
docker build -t liberator-stream-backend .
docker run -p 3001:3001 liberator-stream-backend
```

## API Endpoints

- `GET /health` - Health check endpoint
- `WebSocket /ws` - Real-time data streaming

## Project Structure

```
backend/
├── src/
│   ├── services/     # External API integrations
│   ├── utils/        # Scheduling and utilities
│   ├── websocket/    # WebSocket server
│   └── app.js        # Main application
├── Dockerfile
└── package.json
```

## Development

This backend service is designed to work as part of a larger streaming infrastructure. The API surface and functionality may change as requirements evolve.
