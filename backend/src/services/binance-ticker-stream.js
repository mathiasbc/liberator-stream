const WebSocket = require('ws');
const { EventEmitter } = require('events');

// Binance's market-data-only stream host first (same reason the REST adapter
// uses data-api.binance.vision: the main host answers 451 in some regions),
// with the main host as a second option. Override with BINANCE_WS_URL
// (comma-separated) if a deploy region needs something else.
const DEFAULT_ENDPOINTS = [
  'wss://data-stream.binance.vision/ws/btcusdt@ticker',
  'wss://stream.binance.com:443/ws/btcusdt@ticker',
];

// The 24h ticker stream pushes once a second; 15s of silence means the
// socket is dead even if it never closed.
const STALE_MS = 15 * 1000;
const WATCHDOG_MS = 5 * 1000;
const HANDSHAKE_TIMEOUT_MS = 10 * 1000;

// Reconnects back off 1s → 60s (with jitter), and a connection that lived
// this long counts as healthy again and resets the backoff.
const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 60 * 1000;
const STABLE_MS = 60 * 1000;

// Binance allows 300 connection attempts per 5 minutes per IP. Never get
// anywhere near that, however badly the network behaves.
const MAX_ATTEMPTS = 20;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Binance 24hr ticker event -> the cache's market data shape.
 * Accepts both raw (/ws) and combined (/stream) payloads.
 */
const normalizeTicker = (message) => {
  const d = message && message.data ? message.data : message;
  if (!d || d.e !== '24hrTicker') return null;

  const price = num(d.c);
  if (!price || price <= 0) return null;

  return {
    currentPrice: price,
    priceChange: num(d.P) ?? 0,
    volume: num(d.q) ?? 0,
    dayOpen: num(d.o),
    dayHigh: num(d.h),
    dayLow: num(d.l),
    dayClose: price,
  };
};

/**
 * Live BTCUSDT price over a single Binance WebSocket.
 *
 * Emits:
 *   'ticker' (marketData) — about once a second while live
 *   'up'                  — first message after (re)connecting
 *   'down' (reason)       — the stream stopped delivering
 *
 * Never throws; callers fall back to REST while isHealthy() is false.
 */
class BinanceTickerStream extends EventEmitter {
  constructor({
    endpoints = DEFAULT_ENDPOINTS,
    WebSocketImpl = WebSocket,
    now = Date.now,
  } = {}) {
    super();
    this.endpoints = endpoints.length ? endpoints : DEFAULT_ENDPOINTS;
    this.WebSocketImpl = WebSocketImpl;
    this.now = now;

    this.ws = null;
    this.endpointIndex = 0;
    this.stopped = true;
    this.live = false;
    this.backoff = MIN_BACKOFF_MS;
    this.attempts = [];
    this.reconnectTimer = null;
    this.watchdog = null;

    this.connectedAt = null;
    this.lastMessageAt = null;
    this.gotDataThisConnection = false;
    this.messages = 0;
    this.reconnects = 0;
    this.lastError = null;
  }

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.watchdog = setInterval(() => this.checkStale(), WATCHDOG_MS);
    this.connect();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.watchdog);
    this.reconnectTimer = null;
    this.watchdog = null;
    this.dropSocket();
    this.live = false;
  }

  isHealthy() {
    return (
      this.live &&
      this.lastMessageAt !== null &&
      this.now() - this.lastMessageAt < STALE_MS
    );
  }

  getStatus() {
    return {
      healthy: this.isHealthy(),
      endpoint: this.endpoints[this.endpointIndex % this.endpoints.length],
      connectedAt: this.connectedAt,
      lastMessageAt: this.lastMessageAt,
      messages: this.messages,
      reconnects: this.reconnects,
      attemptsLast5m: this.recentAttempts().length,
      backoffMs: this.backoff,
      lastError: this.lastError,
    };
  }

  recentAttempts() {
    const now = this.now();
    this.attempts = this.attempts.filter((t) => now - t < ATTEMPT_WINDOW_MS);
    return this.attempts;
  }

  connect() {
    if (this.stopped) return;
    this.reconnectTimer = null;

    const attempts = this.recentAttempts();
    if (attempts.length >= MAX_ATTEMPTS) {
      const wait = ATTEMPT_WINDOW_MS - (this.now() - attempts[0]) + 1000;
      console.warn(
        `[PriceStream] ${MAX_ATTEMPTS} connection attempts in 5m; pausing ${Math.round(wait / 1000)}s (REST fallback stays on)`
      );
      this.reconnectTimer = setTimeout(() => this.connect(), wait);
      return;
    }
    this.attempts.push(this.now());

    const url = this.endpoints[this.endpointIndex % this.endpoints.length];
    this.gotDataThisConnection = false;
    this.connectedAt = null;

    let ws;
    try {
      ws = new this.WebSocketImpl(url, {
        handshakeTimeout: HANDSHAKE_TIMEOUT_MS,
      });
    } catch (error) {
      this.handleDrop(`connect failed: ${error.message}`);
      return;
    }
    this.ws = ws;

    ws.on('open', () => {
      this.connectedAt = this.now();
      console.log(`[PriceStream] connected to ${url}`);
    });
    ws.on('message', (raw) => this.handleMessage(raw));
    ws.on('error', (error) => {
      this.lastError = error.message;
    });
    ws.on('close', (code) => {
      if (this.ws === ws) this.handleDrop(`closed (${code})`);
    });
  }

  handleMessage(raw) {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const data = normalizeTicker(message);
    if (!data) return;

    this.lastMessageAt = this.now();
    this.gotDataThisConnection = true;
    this.messages = (this.messages + 1) % 1e9;
    if (!this.live) {
      this.live = true;
      this.emit('up');
    }
    this.emit('ticker', data);
  }

  checkStale() {
    if (!this.ws) return;
    const since = this.lastMessageAt || this.connectedAt;
    const silentFor = since ? this.now() - since : 0;
    // Covers both a socket that went quiet and one that opened but never
    // delivered (e.g. a proxy that accepts the upgrade and stalls)
    if (
      (this.gotDataThisConnection && silentFor > STALE_MS) ||
      (!this.gotDataThisConnection &&
        this.connectedAt &&
        this.now() - this.connectedAt > STALE_MS)
    ) {
      this.lastError = `no data for ${Math.round(silentFor / 1000)}s`;
      this.dropSocket();
      this.handleDrop(this.lastError);
    }
  }

  dropSocket() {
    const ws = this.ws;
    this.ws = null;
    if (!ws) return;
    ws.removeAllListeners();
    // A late error after listeners are gone would otherwise crash the process
    ws.on('error', () => {});
    try {
      ws.terminate();
    } catch {
      // already closed
    }
  }

  handleDrop(reason) {
    this.dropSocket();
    if (this.live) {
      this.live = false;
      console.warn(`[PriceStream] down: ${reason}`);
      this.emit('down', reason);
    }
    if (this.stopped) return;

    const lived = this.connectedAt ? this.now() - this.connectedAt : 0;
    if (lived >= STABLE_MS) this.backoff = MIN_BACKOFF_MS;
    // An endpoint that never delivered data is probably blocked here
    if (!this.gotDataThisConnection) this.endpointIndex++;

    const delay = Math.round(this.backoff * (0.8 + Math.random() * 0.4));
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
    this.reconnects = (this.reconnects + 1) % 1e9;
    console.log(`[PriceStream] reconnecting in ${Math.round(delay / 1000)}s`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}

const endpointsFromEnv = () =>
  (process.env.BINANCE_WS_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

module.exports = {
  BinanceTickerStream,
  normalizeTicker,
  endpointsFromEnv,
  STALE_MS,
  MAX_ATTEMPTS,
};
