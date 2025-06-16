# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time Bitcoin dashboard application with a unified architecture where a Node.js backend serves both API endpoints and the React frontend as static files. The application streams live Bitcoin data via WebSockets, automatically rotating through different timeframes (5M, 1H, 4H, 1D, 1W) every 60 seconds.

## Architecture

- **Backend**: Koa.js application (`backend/src/app.js`) that serves the React app as static files and provides WebSocket streaming
- **Frontend**: React app with Chakra UI that receives real-time data via WebSockets
- **Data Sources**: CoinGecko API for market/OHLC data, Blockchain.info API for blockchain metrics
- **WebSocket Server**: Real-time data streaming to connected clients (`backend/src/websocket/server.js`)
- **Scheduler**: Automated timeframe rotation and data fetching (`backend/src/utils/scheduler.js`)

## Key Components

- `backend/src/services/coingecko.js`: Handles all CoinGecko API interactions with rate limiting and data processing  
- `backend/src/services/blockchaininfo.js`: Fetches blockchain metrics (block height, market dominance, supply data)
- `backend/src/utils/scheduler.js`: Manages timeframe rotation and coordinates data updates every 60 seconds
- `backend/src/websocket/server.js`: WebSocket server for real-time data broadcasting
- `frontend/src/components/Dashboard.js`: Main dashboard component that renders charts and metrics

## Development Commands

### Unified Production Build
```bash
npm install          # Install root dependencies
npm run build       # Build frontend and install all dependencies
npm start           # Start unified server on port 3001
```

### Development with Hot Reload
```bash
npm run dev         # Start both frontend (port 3000) and backend (port 3001) in development mode
```

### Individual Services
```bash
# Frontend only
cd frontend && npm start

# Backend only  
cd backend && npm run dev

# Docker development
docker-compose up --build
```

### Linting and Formatting
```bash
# Backend
cd backend && npm run lint
cd backend && npm run lint:fix
cd backend && npm run format

# Frontend
cd frontend && npm run lint
cd frontend && npm run lint:fix
cd frontend && npm run format
```

## Important Implementation Details

- **Rate Limiting**: CoinGecko API calls are staggered with 2-3 second delays to prevent rate limiting
- **Timeframe Rotation**: The system automatically cycles through 5M → 1H → 4H → 1D → 1W every 60 seconds
- **Data Caching**: All data is cached in the scheduler and immediately sent to new WebSocket connections
- **OHLC Processing**: Raw market data is converted to proper OHLC format with deduplication and time-based grouping
- **Static File Serving**: The backend serves the built React app from `frontend/build/` directory
- **API Routing**: All API endpoints are prefixed with `/api/` to avoid conflicts with frontend routing

## File Structure Notes

- Frontend build output goes to `frontend/build/` and is served by the backend
- WebSocket connections are established at the same domain/port as the HTTP server
- Environment variables can be set in `backend/.env` (see `backend/.env.example`)
- The root `package.json` contains unified build scripts for deployment platforms like Render