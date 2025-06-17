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
    this.isUpdating = false;
    this.updateCycle = 0;
    this.intervals = new Map();

    // Memory and performance tracking
    this.lastBroadcast = 0;
    this.broadcastCount = 0;
    this.errorCount = 0;
    this.successCount = 0;
  }

  /**
   * Start the resilient scheduler
   */
  start() {
    console.log(
      '[ResilientScheduler] Starting with resilient API architecture...'
    );

    // Initialize with initial data fetch
    this.updateInitialData();

    // Start different update intervals for different data types
    this.startUpdateIntervals();

    console.log('[ResilientScheduler] All update intervals started');
  }

  /**
   * Start different update intervals for optimal API usage
   */
  startUpdateIntervals() {
    // Market data - most frequent (every 30 seconds)
    this.intervals.set(
      'market',
      setInterval(() => {
        if (!this.isUpdating) {
          this.updateMarketData();
        }
      }, UPDATE_INTERVALS.MARKET_DATA)
    );

    // OHLC data with timeframe rotation (every 60 seconds)
    this.intervals.set(
      'ohlc',
      setInterval(() => {
        if (!this.isUpdating) {
          this.updateOHLCData();
        }
      }, UPDATE_INTERVALS.OHLC_DATA)
    );

    // Blockchain data - less frequent (every 2 minutes)
    this.intervals.set(
      'blockchain',
      setInterval(() => {
        if (!this.isUpdating) {
          this.updateBlockchainData();
        }
      }, UPDATE_INTERVALS.BLOCKCHAIN_DATA)
    );

    // Supply and global data - least frequent (every 5 minutes)
    this.intervals.set(
      'supply',
      setInterval(() => {
        if (!this.isUpdating) {
          this.updateSupplyData();
        }
      }, UPDATE_INTERVALS.GLOBAL_DATA)
    );

    this.intervals.set(
      'global',
      setInterval(() => {
        if (!this.isUpdating) {
          this.updateGlobalData();
        }
      }, UPDATE_INTERVALS.GLOBAL_DATA)
    );
  }

  /**
   * Stop all update intervals
   */
  stop() {
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`[ResilientScheduler] Stopped ${name} interval`);
    });
    this.intervals.clear();
  }

  /**
   * Initial data fetch for first load
   */
  async updateInitialData() {
    if (this.isUpdating) {
      console.log(
        '[ResilientScheduler] Initial data fetch already in progress'
      );
      return;
    }

    this.isUpdating = true;

    try {
      console.log(
        `[ResilientScheduler] Loading initial data for timeframe: ${this.currentTimeframe}...`
      );

      // Fetch all data types in parallel with staggered timing
      const fetchPromises = [
        this.fetchMarketDataSafe(),
        this.delay(1000).then(() =>
          this.fetchOHLCDataSafe(this.currentTimeframe)
        ),
        this.delay(2000).then(() => this.fetchBlockchainDataSafe()),
        this.delay(3000).then(() => this.fetchSupplyDataSafe()),
        this.delay(4000).then(() => this.fetchGlobalDataSafe()),
      ];

      await Promise.allSettled(fetchPromises);

      // Update current timeframe in cache
      this.cacheService.updateCurrentTimeframe(this.currentTimeframe);

      // Broadcast initial data
      this.broadcastCacheData();

      console.log('[ResilientScheduler] Initial data loading completed');
    } catch (error) {
      console.error(
        '[ResilientScheduler] Error in initial data fetch:',
        error.message
      );
      this.errorCount++;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Update market data
   */
  async updateMarketData() {
    try {
      console.log('[ResilientScheduler] Updating market data...');
      const result = await this.apiManager.getMarketData();

      if (this.cacheService.updateMarketData(result.data, result.source)) {
        this.broadcastCacheData();
        this.successCount++;
      }
    } catch (error) {
      console.error(
        '[ResilientScheduler] Market data update failed:',
        error.message
      );
      this.errorCount++;
    }
  }

  /**
   * Update OHLC data with timeframe rotation
   */
  async updateOHLCData() {
    try {
      // Rotate timeframe
      this.currentTimeframe = getNextTimeframe(this.currentTimeframe);
      console.log(
        `[ResilientScheduler] Updating OHLC data for timeframe: ${this.currentTimeframe}`
      );

      const result = await this.apiManager.getOHLCData(this.currentTimeframe);

      if (
        this.cacheService.updateOHLCData(
          this.currentTimeframe,
          result.data,
          result.source
        )
      ) {
        this.cacheService.updateCurrentTimeframe(this.currentTimeframe);
        this.broadcastCacheData();
        this.successCount++;
      }
    } catch (error) {
      console.error(
        `[ResilientScheduler] OHLC data update failed for ${this.currentTimeframe}:`,
        error.message
      );
      this.errorCount++;
    }
  }

  /**
   * Update blockchain data
   */
  async updateBlockchainData() {
    try {
      console.log('[ResilientScheduler] Updating blockchain data...');
      const result = await this.apiManager.getBlockchainData();

      if (this.cacheService.updateBlockchainData(result.data, result.source)) {
        this.broadcastCacheData();
        this.successCount++;
      }
    } catch (error) {
      console.error(
        '[ResilientScheduler] Blockchain data update failed:',
        error.message
      );
      this.errorCount++;
    }
  }

  /**
   * Update supply data
   */
  async updateSupplyData() {
    try {
      console.log('[ResilientScheduler] Updating supply data...');
      const result = await this.apiManager.getSupplyData();

      if (this.cacheService.updateSupplyData(result.data, result.source)) {
        this.broadcastCacheData();
        this.successCount++;
      }
    } catch (error) {
      console.error(
        '[ResilientScheduler] Supply data update failed:',
        error.message
      );
      this.errorCount++;
    }
  }

  /**
   * Update global market data
   */
  async updateGlobalData() {
    try {
      console.log('[ResilientScheduler] Updating global market data...');
      const result = await this.apiManager.getGlobalMarketData();

      if (this.cacheService.updateGlobalData(result.data, result.source)) {
        this.broadcastCacheData();
        this.successCount++;
      }
    } catch (error) {
      console.error(
        '[ResilientScheduler] Global data update failed:',
        error.message
      );
      this.errorCount++;
    }
  }

  /**
   * Safe fetch methods that don't throw (for parallel execution)
   */
  async fetchMarketDataSafe() {
    try {
      const result = await this.apiManager.getMarketData();
      this.cacheService.updateMarketData(result.data, result.source);
      return result;
    } catch (error) {
      console.error(
        '[ResilientScheduler] Safe market data fetch failed:',
        error.message
      );
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
        `[ResilientScheduler] Safe OHLC data fetch failed for ${timeframe}:`,
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
      console.error(
        '[ResilientScheduler] Safe blockchain data fetch failed:',
        error.message
      );
      return null;
    }
  }

  async fetchSupplyDataSafe() {
    try {
      const result = await this.apiManager.getSupplyData();
      this.cacheService.updateSupplyData(result.data, result.source);
      return result;
    } catch (error) {
      console.error(
        '[ResilientScheduler] Safe supply data fetch failed:',
        error.message
      );
      return null;
    }
  }

  async fetchGlobalDataSafe() {
    try {
      const result = await this.apiManager.getGlobalMarketData();
      this.cacheService.updateGlobalData(result.data, result.source);
      return result;
    } catch (error) {
      console.error(
        '[ResilientScheduler] Safe global data fetch failed:',
        error.message
      );
      return null;
    }
  }

  /**
   * Broadcast cache data to WebSocket clients
   */
  broadcastCacheData() {
    const now = Date.now();

    // Throttle broadcasts to avoid overwhelming clients
    if (now - this.lastBroadcast < 1000) {
      // Min 1 second between broadcasts
      return;
    }

    const cacheData = this.cacheService.getFormattedData();
    websocketServer.updateData(cacheData);

    this.lastBroadcast = now;
    this.broadcastCount++;
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    return {
      scheduler: {
        currentTimeframe: this.currentTimeframe,
        isUpdating: this.isUpdating,
        updateCycle: this.updateCycle,
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

  /**
   * Manual memory cleanup
   */
  forceMemoryCleanup() {
    this.cacheService.forceMemoryCleanup();
    this.apiManager.forceMemoryCleanup();

    // Reset counters if they're getting large
    if (this.broadcastCount > 1000000) {
      this.broadcastCount = 0;
    }
    if (this.errorCount > 1000000) {
      this.errorCount = 0;
    }
    if (this.successCount > 1000000) {
      this.successCount = 0;
    }

    console.log('[ResilientScheduler] Forced memory cleanup completed');
  }

  /**
   * Get current cache data (for debugging)
   */
  getCurrentCacheData() {
    return this.cacheService.getFormattedData();
  }
}

module.exports = ResilientScheduler;
