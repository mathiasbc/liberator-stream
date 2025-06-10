const WebSocket = require('ws');

const BROADCAST_INTERVAL_MS = 60000; // 60s

class WebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    this.cachedData = null;
    this.broadcastInterval = null;
  }

  init(server) {
    this.wss = new WebSocket.Server({ server });
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`Client connected. Total clients: ${this.clients.size}`);
      // Send latest data immediately on connect
      if (this.cachedData) {
        try {
          const message = JSON.stringify(this.cachedData);
          ws.send(message);
          console.log(
            'Sent initial data to new client:',
            Object.keys(this.cachedData)
          );
        } catch (error) {
          console.error('Error sending initial data to client:', error);
        }
      } else {
        console.warn('No cached data available for new client');
      }
      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`Client disconnected. Total clients: ${this.clients.size}`);
      });
    });
    this.broadcastInterval = setInterval(() => {
      if (this.cachedData) {
        console.log('Broadcasting data on interval');
        this.broadcast(this.cachedData);
      } else {
        console.warn('No cached data available for broadcast');
      }
    }, BROADCAST_INTERVAL_MS);
    console.log('WebSocket server initialized');
  }

  updateData(data) {
    const oldData = this.cachedData;
    this.cachedData = data;

    // Check if data has actually changed
    if (JSON.stringify(oldData) !== JSON.stringify(data)) {
      console.log('Data updated, broadcasting to all clients');
      this.broadcast(data); // Broadcast immediately when data changes
    }
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    let successCount = 0;
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        successCount++;
      }
    }
    console.log(
      `Broadcast complete. Sent to ${successCount}/${this.clients.size} clients`
    );
  }
}

module.exports = new WebSocketServer();
