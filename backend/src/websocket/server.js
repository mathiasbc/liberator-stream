const WebSocket = require('ws');

class WebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    this.cachedData = null;
  }

  init(server) {
    this.wss = new WebSocket.Server({ server });
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`[WS] client connected (${this.clients.size} total)`);

      if (this.cachedData) {
        try {
          ws.send(JSON.stringify(this.cachedData));
        } catch (error) {
          console.error('[WS] error sending initial data:', error.message);
        }
      }

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WS] client disconnected (${this.clients.size} total)`);
      });

      ws.on('error', (err) => {
        console.error('[WS] client error:', err.message);
      });
    });
    console.log('[WS] server initialized');
  }

  updateData(data) {
    this.cachedData = data;
    this.broadcast(data);
  }

  broadcast(data) {
    if (this.clients.size === 0) return;
    const message = JSON.stringify(data);
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
}

module.exports = new WebSocketServer();
