const {
  CACHE_SCHEMA,
  FIELD_MAPPINGS,
  validateMarketData,
  validateOHLCData,
  validateBlockchainData,
  validateSupplyData,
} = require('./schema');
const { TIMEFRAMES, DEFAULT_TIMEFRAME } = require('../config/timeframes');

// Memory management constants
const MAX_HISTORY_SIZE = 100;
const MEMORY_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const MAX_SAFE_COUNTER = Number.MAX_SAFE_INTEGER - 10000;

class CacheService {
  constructor() {
    this.cache = this.initializeCache();
    this.lastUpdateTimes = {};
    this.dataSourceHistory = [];
    this.maxHistorySize = MAX_HISTORY_SIZE;

    // Memory management
    this.updateCounter = 0;
    this.lastMemoryCleanup = Date.now();
    this.memoryCleanupInterval = null;
    this.setupMemoryManagement();
  }

  /**
   * Setup periodic memory management
   */
  setupMemoryManagement() {
    this.memoryCleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, MEMORY_CLEANUP_INTERVAL);

    console.log('[CacheService] Memory management initialized');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = null;
    }
    console.log('[CacheService] Memory management cleaned up');
  }

  /**
   * Perform memory cleanup
   */
  performMemoryCleanup() {
    const now = Date.now();
    let cleanedItems = 0;

    // Reset update counter if it's getting too large
    if (this.updateCounter > MAX_SAFE_COUNTER) {
      this.updateCounter = 0;
      cleanedItems++;
    }

    // Trim history more aggressively if needed
    if (this.dataSourceHistory.length > this.maxHistorySize) {
      const excess = this.dataSourceHistory.length - this.maxHistorySize;
      this.dataSourceHistory.splice(0, excess);
      cleanedItems++;
    }

    // Clean old update times (keep only last 24 hours)
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    Object.keys(this.lastUpdateTimes).forEach((key) => {
      const updateTime = new Date(this.lastUpdateTimes[key]).getTime();
      if (updateTime < oneDayAgo) {
        delete this.lastUpdateTimes[key];
        cleanedItems++;
      }
    });

    // Force garbage collection hint (if available)
    if (global.gc && cleanedItems > 0) {
      global.gc();
    }

    this.lastMemoryCleanup = now;

    if (cleanedItems > 0) {
      console.log(
        `[CacheService] Memory cleanup completed: ${cleanedItems} items cleaned`
      );
    }
  }

  /**
   * Initialize cache with default schema
   */
  initializeCache() {
    return JSON.parse(JSON.stringify(CACHE_SCHEMA));
  }

  /**
   * Get all cached data
   */
  getAll() {
    return { ...this.cache };
  }

  /**
   * Get specific field from cache
   */
  get(field) {
    return this.cache[field];
  }

  /**
   * Update market data in cache
   */
  updateMarketData(data, source) {
    if (!validateMarketData(data)) {
      console.warn(`Invalid market data from ${source}:`, data);
      return false;
    }

    const updated = [];
    FIELD_MAPPINGS.MARKET_DATA.forEach((field) => {
      if (data[field] !== undefined && data[field] !== this.cache[field]) {
        this.cache[field] = data[field];
        updated.push(field);
      }
    });

    if (updated.length > 0) {
      this.recordUpdate('market', source, updated);
      console.log(`[Cache] Updated market data from ${source}:`, updated);
      return true;
    }

    return false;
  }

  /**
   * Update OHLC data for a specific timeframe
   */
  updateOHLCData(timeframe, data, source) {
    if (!TIMEFRAMES.includes(timeframe)) {
      console.warn(`Invalid timeframe: ${timeframe}`);
      return false;
    }

    if (!validateOHLCData(data)) {
      console.warn(
        `Invalid OHLC data from ${source} for ${timeframe}:`,
        data?.length || 0,
        'candles'
      );
      return false;
    }

    const previousLength = this.cache.ohlcData[timeframe]?.length || 0;
    this.cache.ohlcData[timeframe] = data;

    this.recordUpdate('ohlc', source, [timeframe]);
    console.log(
      `[Cache] Updated OHLC data for ${timeframe} from ${source}: ${previousLength} -> ${data.length} candles`
    );
    return true;
  }

  /**
   * Update blockchain data in cache
   */
  updateBlockchainData(data, source) {
    if (!validateBlockchainData(data)) {
      console.warn(`Invalid blockchain data from ${source}:`, data);
      return false;
    }

    const updated = [];
    FIELD_MAPPINGS.BLOCKCHAIN_DATA.forEach((field) => {
      if (data[field] !== undefined && data[field] !== this.cache[field]) {
        this.cache[field] = data[field];
        updated.push(field);
      }
    });

    if (updated.length > 0) {
      this.recordUpdate('blockchain', source, updated);
      console.log(`[Cache] Updated blockchain data from ${source}:`, updated);
      return true;
    }

    return false;
  }

  /**
   * Update supply data in cache
   */
  updateSupplyData(data, source) {
    const updated = [];

    // Update totalSupply
    if (data.totalSupply && validateSupplyData(data.totalSupply)) {
      if (
        JSON.stringify(data.totalSupply) !==
        JSON.stringify(this.cache.totalSupply)
      ) {
        this.cache.totalSupply = data.totalSupply;
        updated.push('totalSupply');
      }
    }

    // Update extendedSupplyData
    if (data.extendedSupplyData) {
      if (
        JSON.stringify(data.extendedSupplyData) !==
        JSON.stringify(this.cache.extendedSupplyData)
      ) {
        this.cache.extendedSupplyData = data.extendedSupplyData;
        updated.push('extendedSupplyData');
      }
    }

    if (updated.length > 0) {
      this.recordUpdate('supply', source, updated);
      console.log(`[Cache] Updated supply data from ${source}:`, updated);
      return true;
    }

    return false;
  }

  /**
   * Update global market data in cache
   */
  updateGlobalData(data, source) {
    const updated = [];

    // Update marketDominance (for backward compatibility)
    if (
      data.marketDominance !== undefined &&
      data.marketDominance !== this.cache.marketDominance
    ) {
      this.cache.marketDominance = data.marketDominance;
      updated.push('marketDominance');
    }

    // Update globalMarketData
    if (data.globalMarketData) {
      if (
        JSON.stringify(data.globalMarketData) !==
        JSON.stringify(this.cache.globalMarketData)
      ) {
        this.cache.globalMarketData = data.globalMarketData;
        updated.push('globalMarketData');
      }
    }

    if (updated.length > 0) {
      this.recordUpdate('global', source, updated);
      console.log(`[Cache] Updated global data from ${source}:`, updated);
      return true;
    }

    return false;
  }

  /**
   * Update current timeframe
   */
  updateCurrentTimeframe(timeframe) {
    if (!TIMEFRAMES.includes(timeframe)) {
      console.warn(`Invalid timeframe: ${timeframe}`);
      return false;
    }

    if (this.cache.currentTimeframe !== timeframe) {
      this.cache.currentTimeframe = timeframe;
      console.log(`[Cache] Updated current timeframe to: ${timeframe}`);
      return true;
    }

    return false;
  }

  /**
   * Record update history for debugging and monitoring
   */
  recordUpdate(dataType, source, fields) {
    // Increment update counter with overflow protection
    this.updateCounter = (this.updateCounter + 1) % MAX_SAFE_COUNTER;

    const timestamp = new Date().toISOString();
    this.lastUpdateTimes[dataType] = timestamp;
    this.cache.lastUpdate = timestamp;
    this.cache.dataSource = source;

    // Keep update history with efficient memory management
    const historyEntry = {
      id: this.updateCounter,
      timestamp,
      dataType,
      source,
      fields: Array.isArray(fields) ? fields.slice() : fields, // Shallow copy to prevent reference issues
    };

    this.dataSourceHistory.push(historyEntry);

    // Trim history efficiently - remove oldest entries when over limit
    if (this.dataSourceHistory.length > this.maxHistorySize) {
      // Remove oldest entries in batches for efficiency
      const excess = this.dataSourceHistory.length - this.maxHistorySize;
      this.dataSourceHistory.splice(0, excess);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const ohlcStats = {};
    TIMEFRAMES.forEach((tf) => {
      ohlcStats[tf] = this.cache.ohlcData[tf]?.length || 0;
    });

    return {
      lastUpdate: this.cache.lastUpdate,
      dataSource: this.cache.dataSource,
      currentTimeframe: this.cache.currentTimeframe,
      marketDataAvailable: this.cache.currentPrice !== null,
      blockchainDataAvailable: this.cache.blockHeight !== null,
      supplyDataAvailable: this.cache.totalSupply?.current !== null,
      globalDataAvailable: this.cache.marketDominance !== null,
      ohlcDataAvailable: ohlcStats,
      lastUpdateTimes: { ...this.lastUpdateTimes },
      updateHistory: this.dataSourceHistory.slice(-10), // Last 10 updates
      memoryInfo: {
        updateCounter: this.updateCounter,
        historySize: this.dataSourceHistory.length,
        maxHistorySize: this.maxHistorySize,
        lastMemoryCleanup: this.lastMemoryCleanup,
        memoryCleanupAge: Date.now() - this.lastMemoryCleanup,
        memoryUsage: process.memoryUsage ? process.memoryUsage() : null,
      },
    };
  }

  /**
   * Manual memory cleanup trigger
   */
  forceMemoryCleanup() {
    this.performMemoryCleanup();
    console.log('[CacheService] Forced memory cleanup completed');
  }

  /**
   * Clear all cache data
   */
  clear() {
    this.cache = this.initializeCache();
    this.lastUpdateTimes = {};
    this.dataSourceHistory = [];
    console.log('[Cache] Cleared all cached data');
  }

  /**
   * Get cache data formatted for frontend
   */
  getFormattedData() {
    // Return cache data in exactly the format expected by frontend
    return {
      ...this.cache,
      // Ensure currentTimeframe is set
      currentTimeframe: this.cache.currentTimeframe || DEFAULT_TIMEFRAME,
    };
  }
}

module.exports = CacheService;
