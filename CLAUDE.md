# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time Bitcoin dashboard application with a **multi-source API architecture** where a Node.js backend intelligently manages multiple data sources and serves the React frontend as static files. The application streams live Bitcoin data via WebSockets with automatic API rotation, fallback mechanisms, and memory optimization for 24/7 deployment.

## Architecture

**Main Application** (`backend/src/app.js`)

- **API Management**: Multi-source API system with intelligent rotation and fallback (`backend/src/services/api-manager.js`)
- **Cache Layer**: Centralized cache service with memory management (`backend/src/cache/cache-service.js`)  
- **Scheduler**: Scheduler with different update intervals and memory management (`backend/src/services/scheduler.js`)
- **Adapters**: Modular API adapters for each data source (`backend/src/adapters/`)
- **Configuration**: Centralized timeframe and API configuration (`backend/src/config/timeframes.js`)

## Key Components

### API Architecture Components

- `backend/src/adapters/base-adapter.js`: Abstract base class for all API adapters with retry logic and rate limiting
- `backend/src/adapters/coingecko-adapter.js`: CoinGecko API implementation (market, OHLC, supply, global data)
- `backend/src/adapters/coincap-adapter.js`: CoinCap API implementation (market, OHLC, supply data)
- `backend/src/adapters/binance-adapter.js`: Binance API implementation (market, OHLC data)
- `backend/src/adapters/blockstream-adapter.js`: Blockstream API implementation (blockchain data)
- `backend/src/services/api-manager.js`: API rotation manager with health monitoring and fallback logic
- `backend/src/services/scheduler.js`: Advanced scheduler with memory management and multiple update intervals
- `backend/src/cache/cache-service.js`: Centralized cache with validation, memory cleanup, and overflow protection
- `backend/src/config/timeframes.js`: Single source of truth for all timeframe configurations

### Frontend Components

- `frontend/src/components/Dashboard.js`: Main dashboard component with WebSocket integration
- `frontend/src/components/Chart.js`: OHLC chart component using Lightweight Charts
- `frontend/src/components/Header.js`: Header with block height and system status
- `frontend/src/components/PriceSection.js`: Price display with metrics and supply data

## Development Commands

### Production and Development

```bash
# Production deployment
npm install && npm run build
npm start  # Start backend on port 3001

# Development with hot reload
npm run dev  # Start both frontend (port 3000) and backend (port 3001)

# System monitoring (when running)
curl http://localhost:3001/api/stats     # Comprehensive system statistics
curl http://localhost:3001/api/adapters  # API adapter health status
curl http://localhost:3001/api/memory    # Memory usage monitoring
```

### Testing

```bash
# Backend integration tests
cd backend && npm run test:integration

# Frontend integration tests  
cd frontend && npm run test:integration

# Full system integration test
node test-integration.js

# Watch mode for development
cd backend && npm run test:watch
```

### Docker Development

```bash
docker-compose up --build  # Separate frontend/backend containers
```

### Linting and Formatting

```bash
# Backend
cd backend && npm run lint && npm run format

# Frontend  
cd frontend && npm run lint && npm run format
```

## Important Implementation Details

### Architecture Features

- **API Rotation**: Intelligent cycling between multiple API sources to prevent rate limiting
- **Memory Management**: Automatic cleanup with overflow protection for long-running deployment
- **Fallback Mechanisms**: Automatic source switching when APIs fail with health recovery detection
- **Centralized Configuration**: All timeframe settings managed in `backend/src/config/timeframes.js`
- **Cache Validation**: Data validation and consistency checks before caching
- **Health Monitoring**: Real-time tracking of API adapter performance and system metrics

### Implementation Details

- **OHLC Processing**: Raw market data converted to proper OHLC format with deduplication and time-based grouping
- **Static File Serving**: Backend serves the built React app from `frontend/build/` directory
- **API Routing**: All API endpoints prefixed with `/api/` to avoid conflicts with frontend routing
- **WebSocket Integration**: Real-time data streaming with automatic reconnection on client side

## Development Guidelines

### When Adding New API Sources

1. Create new adapter extending `BaseAdapter` in `backend/src/adapters/`
2. Implement required methods: `getMarketData()`, `getOHLCData()`, `getBlockchainData()`, etc.
3. Add adapter to `APIManager` in `backend/src/services/api-manager.js`
4. Update priority lists in `adapterPriorities` configuration
5. Add timeframe configuration in `backend/src/config/timeframes.js`
6. Write integration tests in `backend/src/__tests__/integration/`

### Memory Optimization Guidelines

- Use bounded arrays with maximum size limits
- Implement periodic cleanup for counters and historical data
- Monitor memory usage through `/api/memory` endpoint
- Use circular buffers for historical data storage
- Implement overflow protection for long-running counters

### Testing Guidelines

- Write integration tests for all API adapters
- Test fallback mechanisms and error scenarios
- Validate OHLC data structure and relationships
- Test memory management and cleanup functions
- Use comprehensive test runner for system validation

## File Structure Notes

- **Main Application**: Use `backend/src/app.js` as main entry point
- **API Adapters**: Each data source has dedicated adapter in `backend/src/adapters/`
- **Cache System**: Centralized cache service handles all data validation and storage
- **Configuration**: Single source of truth for timeframes in `backend/src/config/timeframes.js`
- **Testing**: Integration tests in both `backend/src/__tests__/` and `frontend/src/__tests__/`
- **Environment**: Variables set in `backend/.env` (see `backend/.env.example`)
- **Build**: Root `package.json` contains unified build scripts for deployment platforms