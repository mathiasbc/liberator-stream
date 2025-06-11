# Liberator Stream - Bitcoin Dashboard

A real-time Bitcoin dashboard application built with React for YouTube streaming.

## Current Status

⚠️ **This project is in active development and subject to frequent changes.**

## Features

- Real-time Bitcoin price and market data
- Interactive price charts with multiple timeframes (5M, 1H, 4H, 1D, 1W)
- Blockchain statistics (block height, market dominance, total supply)
- Auto-rotating timeframes for streaming purposes
- Client-side data caching and rate limiting
- Modern, responsive UI optimized for streaming

## Tech Stack

- **Frontend**: React + Chakra UI + Lightweight Charts
- **Data Sources**: CoinGecko & Blockchain.info APIs
- **Containerization**: Docker

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or use Docker
docker-compose up
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run linting
- `npm run format` - Format code

## Project Structure

```
├── src/
│   ├── components/   # React components
│   ├── services/     # API integrations
│   ├── hooks/        # Custom React hooks
│   ├── theme/        # UI theme configuration
│   └── App.js        # Main application
├── public/           # Static assets
├── Dockerfile
└── package.json
```

## Architecture

This application uses a simplified architecture designed specifically for streaming:

- **Direct API Integration**: Fetches data directly from CoinGecko and Blockchain APIs
- **Client-side Scheduling**: 60-second update cycles with automatic timeframe rotation
- **Rate Limiting**: Built-in delays to respect API rate limits
- **Local Caching**: Efficient data management without external dependencies

## Development

The application automatically rotates between different timeframes (5M, 1H, 4H, 1D, 1W) every 60 seconds, making it perfect for live streaming scenarios where viewers want to see different chart perspectives.

## Installation & Development

```bash
# Clone the repository
git clone <your-repo-url>
cd liberator-stream

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`.
