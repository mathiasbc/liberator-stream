const WebSocket = require('ws');

// Ping every client this often; one that misses a pong is terminated so
// half-open connections don't pile up over a 24/7 run.
const HEARTBEAT_MS = 30 * 1000;
// Skip a client whose send buffer is this far behind instead of queueing
// more for it (a stuck tab shouldn't grow server memory without bound).
const MAX_BUFFERED_BYTES = 1024 * 1024;

class WebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    this.cachedData = null;
    this.heartbeat = null;
  }

  init(server) {
    this.wss = new WebSocket.Server({ server });
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
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

    this.heartbeat = setInterval(() => {
      for (const ws of this.clients) {
        if (!ws.isAlive) {
          this.clients.delete(ws);
          ws.terminate();
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }
    }, HEARTBEAT_MS);
    this.wss.on('close', () => clearInterval(this.heartbeat));

    console.log('[WS] server initialized');
  }

  updateData(data) {
    this.cachedData = data;
    this.broadcast(data);
  }

  /**
   * Send only some fields (clients merge them into what they have), and keep
   * the snapshot for newly connecting clients up to date.
   */
  broadcastPartial(partial) {
    if (this.cachedData) this.cachedData = { ...this.cachedData, ...partial };
    this.broadcast(partial);
  }

  broadcast(data) {
    if (this.clients.size === 0) return;
    const message = JSON.stringify(data);
    for (const ws of this.clients) {
      if (
        ws.readyState === WebSocket.OPEN &&
        ws.bufferedAmount < MAX_BUFFERED_BYTES
      ) {
        ws.send(message);
      }
    }
  }
}

module.exports = new WebSocketServer();
