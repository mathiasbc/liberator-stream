# Bitcoin Dashboard

A live Bitcoin dashboard with candlestick charts designed for YouTube streaming.

## Features

- Live Bitcoin candlestick charts
- Multiple timeframes (15m, 1h, 1d, 1w)
- Auto-refresh every 30 seconds
- Real-time WebSocket updates
- Streaming-optimized UI

## Tech Stack

- **Frontend**: React.js + Lightweight Charts
- **Backend**: Koa.js + WebSocket
- **Data Source**: Binance API
- **Containerization**: Docker + Docker Compose

## Quick Start

1. Run the setup script to create the project
2. Start with Docker Compose:
   ```bash
   docker-compose up --build
   ```
3. Open browser:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Development

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### Starting the application
```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Project Structure
```
bitcoin-dashboard/
├── backend/          # Koa.js API server
├── frontend/         # React.js dashboard
├── docker-compose.yml
└── .env
```

## API Endpoints

- `GET /api/bitcoin/candles/:timeframe` - Get candlestick data
- `GET /health` - Health check
- `WebSocket /ws` - Real-time updates

## Streaming Setup

1. Install OBS Studio
2. Add Browser Source pointing to http://localhost:3000
3. Configure for YouTube Live streaming

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test with Docker
5. Submit pull request
