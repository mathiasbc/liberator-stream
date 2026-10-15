const APIManager = require('./api-manager');
const CacheService = require('../cache/cache-service');
const websocketServer = require('../websocket/server');
const {
  BinanceTickerStream,
  endpointsFromEnv,
} = require('./binance-ticker-stream');
const {
  TIMEFRAMES,
  TIMEFRAME_REFRESH,
  UPDATE_INTERVALS,
  getNextTimeframe,
  DEFAULT_TIMEFRAME,
} = require('../config/timeframes');

// Price ticks to browsers: at most one per second
const TICK_MS = 1000;
// When the stream drops, fetch over REST right away unless we just did
const MIN_REST_FALLBACK_GAP = 10 * 1000;

class ResilientScheduler {
  constructor() {
    this.apiManager = new APIManager();
    this.cacheService = new CacheService();
    this.currentTimeframe = DEFAULT_TIMEFRAME;
    this.isInitializing = false;
    this.intervals = new Map();

    this.lastBroadcast = 0;
    this.broadcastCount = 0;
    this.errorCount = 0;
    this.successCount = 0;

    // Live price over a Binance WebSocket; REST polling only runs while the
    // stream is unhealthy. PRICE_STREAM=off disables it entirely.
    this.priceStream =
      process.env.PRICE_STREAM === 'off'
        ? null
        : new BinanceTickerStream({ endpoints: endpointsFromEnv() });
    this.lastTickBroadcast = 0;
    this.tickTimer = null;
    this.lastRestMarketAt = 0;
    this.restMarketSkipped = 0;
  }

  start() {
    console.log('[Scheduler] Starting multi-source data pipeline...');
    this.updateInitialData();
    this.startUpdateIntervals();
    this.startPriceStream();
    console.log('[Scheduler] Update intervals running');
  }

  startPriceStream() {
    if (!this.priceStream) return;
    this.priceStream.on('ticker', (data) => {
      if (
        this.cacheService.updateMarketData(data, 'binance-ws', { quiet: true })
      ) {
        this.queuePriceTick();
      }
    });
    this.priceStream.on('up', () =>
      console.log('[Scheduler] live price stream up; REST price polling paused')
    );
    // Don't wait for the next 30s poll to refill the gap
    this.priceStream.on('down', () => {
      if (Date.now() - this.lastRestMarketAt > MIN_REST_FALLBACK_GAP) {
        this.updateMarketData();
      }
    });
    this.priceStream.start();
  }

  /**
   * Push just the market fields to clients, at most once per TICK_MS
   * (trailing edge, so the newest price always goes out).
   */
  queuePriceTick() {
    if (this.tickTimer) return;
    const wait = Math.max(0, this.lastTickBroadcast + TICK_MS - Date.now());
    this.tickTimer = setTimeout(() => {
      this.tickTimer = null;
      this.lastTickBroadcast = Date.now();
      websocketServer.broadcastPartial(this.cacheService.getMarketSnapshot());
    }, wait);
  }

  startUpdateIntervals() {
    // Live price
    this.intervals.set(
      'market',
      setInterval(() => this.updateMarketData(), UPDATE_INTERVALS.MARKET_DATA)
    );

    // Pure UI rotation — does not trigger network calls
    this.intervals.set(
      'display',
      setInterval(
        () => this.rotateDisplayedTimeframe(),
        UPDATE_INTERVALS.DISPLAY_ROTATION
      )
    );
    this.lastRotationAt = Date.now();

    // One independent fetch loop per timeframe, each at its own cadence
    TIMEFRAMES.forEach((tf) => {
      const period = TIMEFRAME_REFRESH[tf];
      this.intervals.set(
        `ohlc-${tf}`,
        setInterval(() => this.updateOHLCData(tf), period)
      );
    });

    this.intervals.set(
      'blockchain',
      setInterval(
        () => this.updateBlockchainData(),
        UPDATE_INTERVALS.BLOCKCHAIN_DATA
      )
    );
    this.intervals.set(
      'supply',
      setInterval(() => this.updateSupplyData(), UPDATE_INTERVALS.SUPPLY_DATA)
    );
    this.intervals.set(
      'global',
      setInterval(() => this.updateGlobalData(), UPDATE_INTERVALS.GLOBAL_DATA)
    );
  }

  stop() {
    if (this.priceStream) this.priceStream.stop();
    clearTimeout(this.tickTimer);
    this.tickTimer = null;
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`[Scheduler] Stopped ${name} interval`);
    });
    this.intervals.clear();
    this.cacheService.cleanup();
    this.apiManager.cleanup();
  }

  /**
   * Boot fetch — pull every data type in parallel (staggered to avoid
   * upstream rate-limit bursts) so the dashboard has data on first connect.
   */
  async updateInitialData() {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      console.log('[Scheduler] Loading initial data...');

      const ohlcStaggered = TIMEFRAMES.map((tf, i) =>
        this.delay(400 * i).then(() => this.fetchOHLCDataSafe(tf))
      );

      await Promise.allSettled([
        this.fetchMarketDataSafe(),
        this.delay(200).then(() => this.fetchBlockchainDataSafe()),
        this.delay(400).then(() => this.fetchSupplyDataSafe()),
        this.delay(600).then(() => this.fetchGlobalDataSafe()),
        ...ohlcStaggered,
      ]);

      this.cacheService.updateCurrentTimeframe(
        this.currentTimeframe,
        this.rotationInfo()
      );
      this.broadcastCacheData();
      console.log('[Scheduler] Initial data ready');
    } catch (error) {
      console.error('[Scheduler] Initial fetch error:', error.message);
      this.errorCount++;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Cosmetic UI rotation — no network calls. Cache + WS broadcast.
   */
  rotateDisplayedTimeframe() {
    this.lastRotationAt = Date.now();
    this.currentTimeframe = getNextTimeframe(this.currentTimeframe);
    this.cacheService.updateCurrentTimeframe(
      this.currentTimeframe,
      this.rotationInfo()
    );
    this.broadcastCacheData();
  }

  async updateMarketData() {
    // The stream already delivers this every second; skip the API call
    if (this.priceStream?.isHealthy()) {
      this.restMarketSkipped = (this.restMarketSkipped + 1) % 1e9;
      return;
    }
    this.lastRestMarketAt = Date.now();
    try {
      const result = await this.apiManager.getMarketData();
      if (this.cacheService.updateMarketData(result.data, result.source)) {
        this.broadcastCacheData();
        this.successCount++;
      }
    } catch (error) {
      console.error('[Scheduler] market update failed:', error.message);
      this.errorCount++;
    }
  }

  /**
   * Refresh OHLC for a specific timeframe — independent of which one
   * the UI happens to be displaying.
   */
  async updateOHLCData(timeframe) {
    try {
      const result = await this.apiManager.getOHLCData(timeframe);
      if (
        this.cacheService.updateOHLCData(timeframe, result.data, result.source)
      ) {
        this.broadcastCacheData();
        this.successCount++;
      }
    } catch (error) {
      console.error(
        `[Scheduler] OHLC update failed for ${timeframe}:`,
        error.message
      );
      this.errorCount++;
    }
  }

  async updateBlockchainData() {
    try {
      const result = await this.apiManager.getBlockchainData();
      if (this.cacheService.updateBlockchainData(result.data, result.source)) {
        this.broadcastCacheData();
        this.successCount++;
      }
    } catch (error) {
      console.error('[Scheduler] blockchain update failed:', error.message);
      this.errorCount++;
    }
  }

  async updateSupplyData() {
    try {
      const result = await this.apiManager.getSupplyData();
      if (this.cacheService.updateSupplyData(result.data, result.source)) {
        this.broadcastCacheData();
        this.successCount++;
      }
    } catch (error) {
      console.error('[Scheduler] supply update failed:', error.message);
      this.errorCount++;
    }
  }

  async updateGlobalData() {
    try {
      const result = await this.apiManager.getGlobalMarketData();
      if (this.cacheService.updateGlobalData(result.data, result.source)) {
        this.broadcastCacheData();
        this.successCount++;
      }
    } catch (error) {
      console.error('[Scheduler] global update failed:', error.message);
      this.errorCount++;
    }
  }

  async fetchMarketDataSafe() {
    try {
      const result = await this.apiManager.getMarketData();
      this.cacheService.updateMarketData(result.data, result.source);
      return result;
    } catch (error) {
      console.error('[Scheduler] safe market fetch failed:', error.message);
      return null;
    }
  }

  async fetchOHLCDataSafe(timeframe) {
    try {
      const result = await this.apiManager.getOHLCData(timeframe);
      this.cacheService.updateOHLCData(timeframe, result.data, result.source);
      return result;
    } catch (error) {
      console.error(
        `[Scheduler] safe OHLC fetch failed (${timeframe}):`,
        error.message
      );
      return null;
    }
  }

  async fetchBlockchainDataSafe() {
    try {
      const result = await this.apiManager.getBlockchainData();
      this.cacheService.updateBlockchainData(result.data, result.source);
      return result;
    } catch (error) {
      console.error('[Scheduler] safe blockchain fetch failed:', error.message);
      return null;
    }
  }

  async fetchSupplyDataSafe() {
    try {
      const result = await this.apiManager.getSupplyData();
      this.cacheService.updateSupplyData(result.data, result.source);
      return result;
    } catch (error) {
      console.error('[Scheduler] safe supply fetch failed:', error.message);
      return null;
    }
  }

  async fetchGlobalDataSafe() {
    try {
      const result = await this.apiManager.getGlobalMarketData();
      this.cacheService.updateGlobalData(result.data, result.source);
      return result;
    } catch (error) {
      console.error('[Scheduler] safe global fetch failed:', error.message);
      return null;
    }
  }

  broadcastCacheData() {
    const now = Date.now();
    if (now - this.lastBroadcast < 250) return;

    const cacheData = this.cacheService.getFormattedData();
    websocketServer.updateData(cacheData);
    this.lastBroadcast = now;
    this.broadcastCount++;
  }

  // When the displayed timeframe last rotated, so clients can count down
  rotationInfo() {
    return {
      rotatedAt: this.lastRotationAt || Date.now(),
      intervalMs: UPDATE_INTERVALS.DISPLAY_ROTATION,
    };
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      scheduler: {
        currentTimeframe: this.currentTimeframe,
        isInitializing: this.isInitializing,
        successCount: this.successCount,
        errorCount: this.errorCount,
        broadcastCount: this.broadcastCount,
        lastBroadcast: this.lastBroadcast,
        intervals: Array.from(this.intervals.keys()),
        priceStream: this.priceStream
          ? this.priceStream.getStatus()
          : { disabled: true },
        restMarketPollsSkipped: this.restMarketSkipped,
        timeframeRefreshSeconds: Object.fromEntries(
          TIMEFRAMES.map((tf) => [tf, TIMEFRAME_REFRESH[tf] / 1000])
        ),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
      cache: this.cacheService.getStats(),
      apiManager: this.apiManager.getHealthStatus(),
    };
  }

  forceMemoryCleanup() {
    this.cacheService.forceMemoryCleanup();
    this.apiManager.forceMemoryCleanup();

    if (this.broadcastCount > 1_000_000) this.broadcastCount = 0;
    if (this.errorCount > 1_000_000) this.errorCount = 0;
    if (this.successCount > 1_000_000) this.successCount = 0;
  }

  getCurrentCacheData() {
    return this.cacheService.getFormattedData();
  }
}

module.exports = ResilientScheduler;
