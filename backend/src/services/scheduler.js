const APIManager = require('./api-manager');
const CacheService = require('../cache/cache-service');
const websocketServer = require('../websocket/server');
const {
  UPDATE_INTERVALS,
  getNextTimeframe,
  DEFAULT_TIMEFRAME,
} = require('../config/timeframes');

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
  }

  start() {
    console.log('[Scheduler] Starting multi-source data pipeline...');
    this.updateInitialData();
    this.startUpdateIntervals();
    console.log('[Scheduler] Update intervals running');
  }

  startUpdateIntervals() {
    this.intervals.set(
      'market',
      setInterval(() => this.updateMarketData(), UPDATE_INTERVALS.MARKET_DATA)
    );
    this.intervals.set(
      'ohlc',
      setInterval(() => this.updateOHLCData(), UPDATE_INTERVALS.OHLC_DATA)
    );
    this.intervals.set(
      'blockchain',
      setInterval(
        () => this.updateBlockchainData(),
        UPDATE_INTERVALS.BLOCKCHAIN_DATA
      )
    );
    this.intervals.set(
      'supply',
      setInterval(() => this.updateSupplyData(), UPDATE_INTERVALS.GLOBAL_DATA)
    );
    this.intervals.set(
      'global',
      setInterval(() => this.updateGlobalData(), UPDATE_INTERVALS.GLOBAL_DATA)
    );
  }

  stop() {
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`[Scheduler] Stopped ${name} interval`);
    });
    this.intervals.clear();
    this.cacheService.cleanup();
    this.apiManager.cleanup();
  }

  async updateInitialData() {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      console.log(
        `[Scheduler] Loading initial data (timeframe=${this.currentTimeframe})`
      );

      await Promise.allSettled([
        this.fetchMarketDataSafe(),
        this.delay(500).then(() =>
          this.fetchOHLCDataSafe(this.currentTimeframe)
        ),
        this.delay(1000).then(() => this.fetchBlockchainDataSafe()),
        this.delay(1500).then(() => this.fetchSupplyDataSafe()),
        this.delay(2000).then(() => this.fetchGlobalDataSafe()),
      ]);

      this.cacheService.updateCurrentTimeframe(this.currentTimeframe);
      this.broadcastCacheData();
      console.log('[Scheduler] Initial data ready');
    } catch (error) {
      console.error('[Scheduler] Initial fetch error:', error.message);
      this.errorCount++;
    } finally {
      this.isInitializing = false;
    }
  }

  async updateMarketData() {
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

  async updateOHLCData() {
    const nextTimeframe = getNextTimeframe(this.currentTimeframe);
    try {
      console.log(`[Scheduler] OHLC fetch for ${nextTimeframe}`);
      const result = await this.apiManager.getOHLCData(nextTimeframe);

      if (
        this.cacheService.updateOHLCData(
          nextTimeframe,
          result.data,
          result.source
        )
      ) {
        this.currentTimeframe = nextTimeframe;
        this.cacheService.updateCurrentTimeframe(nextTimeframe);
        this.broadcastCacheData();
        this.successCount++;
      }
    } catch (error) {
      console.error(
        `[Scheduler] OHLC update failed for ${nextTimeframe}:`,
        error.message
      );
      this.currentTimeframe = nextTimeframe;
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
