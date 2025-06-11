# Liberator Stream: Bitcoin Live Dashboard

This project is a real-time Bitcoin dashboard that streams live data to a web interface. It is designed to be a comprehensive source of information for Bitcoin, providing live price updates, historical chart data, and key blockchain metrics. The dashboard is built with a modern tech stack and can be deployed as a unified application on a single platform.

## Project Overview

The application provides a live dashboard with the following features:

- **Real-time Price Updates**: Live Bitcoin price updates streamed directly to the dashboard.
- **Historical OHLC Data**: Interactive charts displaying Open, High, Low, and Close (OHLC) data across multiple timeframes (5M, 1H, 4H, 1D, 1W).
- **Key Blockchain Metrics**: Displays critical blockchain information, including the current block height, market dominance, and total supply.
- **Dynamic Timeframe Rotation**: The backend automatically rotates through different timeframes, providing a comprehensive view of the market without any user interaction.

## Architecture

The project uses a **unified architecture** where a single Node.js backend serves both the API endpoints and the React frontend as static files. This design enables simple single-platform deployment while maintaining clean separation of concerns during development.

### Frontend

The frontend is a single-page application built with **React**. It uses:

- **Chakra UI**: For a clean and modern user interface.
- **Lightweight Charts**: To render interactive financial charts.
- **WebSockets**: To receive real-time data from the backend.

### Backend

The backend is a **Koa.js** application that serves three primary purposes:

1.  **Data Aggregation**: It periodically fetches data from external APIs:
    - **CoinGecko**: For market data and OHLC information.
    - **Blockchain.info**: For blockchain-specific metrics.
2.  **Real-time Streaming**: It uses a WebSocket server to push the aggregated data to all connected clients. A scheduler (`node-cron`) manages the data fetching and timeframe rotation.
3.  **Static File Serving**: It serves the built React application as static files, handling routing and fallback to `index.html` for client-side routing.

### API Routes

The backend exposes the following endpoints:
- `/api/health` - Health check endpoint
- `/api/*` - Additional API routes (prefixed with `/api/`)
- `/` - Serves the React application (catch-all for client-side routing)

## Tech Stack

| Area          | Technology                               |
| ------------- | ---------------------------------------- |
| **Frontend**  | React, Chakra UI, Lightweight Charts     |
| **Backend**   | Koa.js, WebSockets (`ws`), Axios, koa-static |
| **DevOps**    | Docker, Docker Compose                   |
| **Deployment**| Render (unified deployment)             |
| **Linting**   | ESLint, Prettier                         |

## Quick Start

### Option 1: Unified Deployment (Production-Ready)

This method builds the frontend and runs everything from the backend server:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/liberator-stream.git
    cd liberator-stream
    ```

2.  **Install dependencies and build:**
    ```bash
    npm install
    npm run build
    npm start
    ```

3.  **Access the application:**
    - **Application**: [http://localhost:3001](http://localhost:3001)
    - **Health Check**: [http://localhost:3001/api/health](http://localhost:3001/api/health)

### Option 2: Development with Docker Compose

For development with hot-reload and separate services:

1.  **Set up environment variables:**
    ```bash
    cp backend/.env.example backend/.env
    ```

2.  **Build and run with Docker Compose:**
    ```bash
    docker-compose up --build
    ```

3.  **Access the application:**
    - **Frontend**: [http://localhost:3000](http://localhost:3000)
    - **Backend Health Check**: [http://localhost:3001/api/health](http://localhost:3001/api/health)

## Deployment

### Render Deployment (Recommended - Free)

This project is optimized for deployment on Render's free tier:

1. **Connect your GitHub repository to Render**
2. **Create a Web Service** with these settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
3. **Environment variables** (optional):
   - `NODE_ENV=production` - Recommended for production

Render's free tier includes 750 hours/month and full WebSocket support, perfect for this application.

### Alternative: Railway Deployment

Railway offers $5/month free credits:

1. **Connect your GitHub repository to Railway**
2. **The build process automatically:**
   - Installs all dependencies
   - Builds the React frontend
   - Starts the unified backend server
3. **Environment variables** (if needed):
   - `PORT` - Automatically set by Railway
   - `NODE_ENV=production` - Recommended for production

### Frontend-Only: Vercel + External Backend

If you want to use Vercel's excellent free frontend hosting:

1. **Deploy Frontend to Vercel**:
   - Connect the `frontend/` directory
   - Build command: `npm run build`
   - Output directory: `build`

2. **Deploy Backend Separately** (Render/Fly.io):
   - Deploy only the `backend/` directory
   - Update frontend's WebSocket URL to point to your backend

The unified architecture means you only need to deploy one service that handles everything.

## Project Structure

```
liberator-stream/
├── backend/
│   ├── src/
│   │   ├── services/       # External API integrations (CoinGecko, Blockchain.info)
│   │   ├── utils/          # Scheduler for data fetching
│   │   ├── websocket/      # WebSocket server implementation
│   │   └── app.js          # Main Koa application (serves API + static files)
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   └── App.js          # Main application component
│   ├── build/              # Production build output (created by npm run build)
│   ├── Dockerfile
│   └── package.json
├── package.json            # Root package.json for unified builds
├── docker-compose.yml      # Docker Compose configuration (development)
└── README.md
```

## How It Works

The backend is the core of the application. On startup, it:

1. **Serves the React Application**: The built frontend files are served as static content from the `/frontend/build` directory.
2. **Provides API Endpoints**: All API routes are prefixed with `/api/` to avoid conflicts with frontend routing.
3. **Establishes WebSocket Connection**: Clients connect via WebSocket for real-time data streaming.
4. **Fetches Initial Data**: Loads market and blockchain data on startup.
5. **Starts Scheduled Updates**: Every 60 seconds, it rotates timeframes and fetches fresh data.

In each update cycle, the backend:
1.  Rotates to a new timeframe (e.g., from `5M` to `1H`).
2.  Fetches the latest market, OHLC, and blockchain data for that timeframe.
3.  Caches the data.
4.  Broadcasts the complete data object to all connected frontend clients via WebSockets.

The frontend receives these WebSocket messages and updates the UI in real-time, providing a seamless live experience. The dynamic WebSocket URL ensures the connection works in both development and production environments.
