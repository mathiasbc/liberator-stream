# Liberator Stream: Bitcoin Live Dashboard

This project is a real-time Bitcoin dashboard that streams live data to a web interface. It is designed to be a comprehensive source of information for Bitcoin, providing live price updates, historical chart data, and key blockchain metrics. The dashboard is built with a modern tech stack and is fully containerized for easy deployment.

## Project Overview

The application provides a live dashboard with the following features:

- **Real-time Price Updates**: Live Bitcoin price updates streamed directly to the dashboard.
- **Historical OHLC Data**: Interactive charts displaying Open, High, Low, and Close (OHLC) data across multiple timeframes (5M, 1H, 4H, 1D, 1W).
- **Key Blockchain Metrics**: Displays critical blockchain information, including the current block height, market dominance, and total supply.
- **Dynamic Timeframe Rotation**: The backend automatically rotates through different timeframes, providing a comprehensive view of the market without any user interaction.

## Architecture

The project follows a classic client-server architecture, with a React frontend and a Node.js backend. The two services are containerized using Docker and managed with Docker Compose.

### Frontend

The frontend is a single-page application built with **React**. It uses:

- **Chakra UI**: For a clean and modern user interface.
- **Lightweight Charts**: To render interactive financial charts.
- **WebSockets**: To receive real-time data from the backend.

### Backend

The backend is a **Koa.js** application that serves two primary purposes:

1.  **Data Aggregation**: It periodically fetches data from external APIs:
    - **CoinGecko**: For market data and OHLC information.
    - **Blockchain.info**: For blockchain-specific metrics.
2.  **Real-time Streaming**: It uses a WebSocket server to push the aggregated data to all connected clients. A scheduler (`node-cron`) manages the data fetching and timeframe rotation.

## Tech Stack

| Area          | Technology                               |
| ------------- | ---------------------------------------- |
| **Frontend**  | React, Chakra UI, Lightweight Charts     |
| **Backend**   | Koa.js, WebSockets (`ws`), Axios         |
| **DevOps**    | Docker, Docker Compose                   |
| **Linting**   | ESLint, Prettier                         |

## Quick Start

The recommended way to run this project is with Docker Compose.

### Prerequisites

- Docker
- Docker Compose

### Running the Application

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/liberator-stream.git
    cd liberator-stream
    ```

2.  **Set up environment variables:**
    The backend requires a `.env` file. You can copy the example file to get started:
    ```bash
    cp backend/.env.example backend/.env
    ```
    No changes are required for the default setup, but you can customize the `PORT` if needed.

3.  **Build and run with Docker Compose:**
    From the root directory, run the following command:
    ```bash
    docker-compose up --build
    ```

4.  **Access the application:**
    - **Frontend**: [http://localhost:3000](http://localhost:3000)
    - **Backend Health Check**: [http://localhost:3001/health](http://localhost:3001/health)

## Project Structure

```
liberator-stream/
├── backend/
│   ├── src/
│   │   ├── services/       # External API integrations (CoinGecko, Blockchain.info)
│   │   ├── utils/          # Scheduler for data fetching
│   │   ├── websocket/      # WebSocket server implementation
│   │   └── app.js          # Main Koa application
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   └── App.js          # Main application component
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Docker Compose configuration
└── README.md
```

## How It Works

The backend is the core of the application. On startup, it fetches an initial set of data and then begins a scheduled cycle of updates every 60 seconds. In each cycle, it:

1.  Rotates to a new timeframe (e.g., from `5M` to `1H`).
2.  Fetches the latest market, OHLC, and blockchain data for that timeframe.
3.  Caches the data.
4.  Broadcasts the complete data object to all connected frontend clients via WebSockets.

The frontend listens for these WebSocket messages and updates the UI in real-time, providing a seamless and live experience.
