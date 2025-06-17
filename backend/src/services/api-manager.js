const CoinGeckoAdapter = require('../adapters/coingecko-adapter');
const BlockstreamAdapter = require('../adapters/blockstream-adapter');
const CoinCapAdapter = require('../adapters/coincap-adapter');
const BinanceAdapter = require('../adapters/binance-adapter');

// Memory management constants
const MAX_SAFE_COUNTER = Number.MAX_SAFE_INTEGER - 10000;
const COUNTER_RESET_THRESHOLD = 1000000;
const HEALTH_RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const MEMORY_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

class APIManager {
  constructor() {
    // Initialize all adapters
    this.adapters = {
      coingecko: new CoinGeckoAdapter(),
      blockstream: new BlockstreamAdapter(),
      coincap: new CoinCapAdapter(),
      binance: new BinanceAdapter(),
    };

    // Define adapter priorities for each data type
    this.adapterPriorities = {
      market: ['coingecko', 'coincap', 'binance'],
      ohlc: ['coingecko', 'binance'],
      blockchain: ['blockstream'],
      supply: ['coingecko', 'coincap'],
      global: ['coingecko'],
    };

    // Track current adapter selection for rotation
    this.currentAdapterIndex = {
      market: 0,
      ohlc: 0,
      blockchain: 0,
      supply: 0,
      global: 0,
    };

    // Track adapter health with memory management
    this.adapterHealth = {};
    this.initializeHealthTracking();

    // Memory management
    this.lastMemoryCleanup = Date.now();
    this.lastHealthReset = Date.now();
    this.setupMemoryManagement();
  }

  /**
   * Initialize health tracking for all adapters
   */
  initializeHealthTracking() {
    Object.keys(this.adapters).forEach((name) => {
      this.adapterHealth[name] = {
        healthy: true,
        consecutiveFailures: 0,
        lastSuccess: null,
        lastFailure: null,
        totalRequests: 0,
        successfulRequests: 0,
        lastCounterReset: Date.now(),
      };
    });
  }

  /**
   * Setup periodic memory management
   */
  setupMemoryManagement() {
    // Periodic memory cleanup
    setInterval(() => {
      this.performMemoryCleanup();
    }, MEMORY_CLEANUP_INTERVAL);

    // Periodic health reset to prevent overflow
    setInterval(() => {
      this.performHealthReset();
    }, HEALTH_RESET_INTERVAL);

    console.log('[APIManager] Memory management initialized');
  }

  /**
   * Perform memory cleanup
   */
  performMemoryCleanup() {
    const now = Date.now();
    let cleanedItems = 0;

    // Check and reset counters if they're getting too large
    Object.keys(this.adapterHealth).forEach((name) => {
      const health = this.adapterHealth[name];

      if (
        health.totalRequests > COUNTER_RESET_THRESHOLD ||
        health.totalRequests > MAX_SAFE_COUNTER
      ) {
        // Reset counters while preserving ratios
        const successRate =
          health.totalRequests > 0
            ? health.successfulRequests / health.totalRequests
            : 0;

        health.totalRequests = Math.min(1000, health.totalRequests);
        health.successfulRequests = Math.floor(
          health.totalRequests * successRate
        );
        health.lastCounterReset = now;

        cleanedItems++;
        console.log(`[APIManager] Reset counters for ${name} adapter`);
      }
    });

    // Force garbage collection hint (if available)
    if (global.gc && cleanedItems > 0) {
      global.gc();
    }

    this.lastMemoryCleanup = now;

    if (cleanedItems > 0) {
      console.log(
        `[APIManager] Memory cleanup completed: ${cleanedItems} adapters cleaned`
      );
    }
  }

  /**
   * Perform periodic health reset
   */
  performHealthReset() {
    const now = Date.now();

    // Reset consecutive failures for all adapters to give them a fresh start
    Object.keys(this.adapterHealth).forEach((name) => {
      const health = this.adapterHealth[name];

      // Reset consecutive failures but keep the adapter marked as unhealthy
      // if it was unhealthy recently (within last hour)
      if (
        health.lastFailure &&
        now - new Date(health.lastFailure).getTime() > 60 * 60 * 1000
      ) {
        health.consecutiveFailures = 0;
        health.healthy = true;
      }
    });

    this.lastHealthReset = now;
    console.log('[APIManager] Performed periodic health reset');
  }

  /**
   * Get the current adapter for a data type
   */
  getCurrentAdapter(dataType) {
    const priorities = this.adapterPriorities[dataType];
    if (!priorities || priorities.length === 0) {
      throw new Error(`No adapters configured for data type: ${dataType}`);
    }

    const currentIndex = this.currentAdapterIndex[dataType];
    const adapterName = priorities[currentIndex];
    const adapter = this.adapters[adapterName];

    if (!adapter) {
      throw new Error(`Adapter ${adapterName} not found`);
    }

    return { adapter, name: adapterName };
  }

  /**
   * Rotate to the next adapter for a data type
   */
  rotateAdapter(dataType) {
    const priorities = this.adapterPriorities[dataType];
    if (!priorities || priorities.length === 0) {
      return null;
    }

    const oldIndex = this.currentAdapterIndex[dataType];
    const oldAdapterName = priorities[oldIndex];

    this.currentAdapterIndex[dataType] = (oldIndex + 1) % priorities.length;

    const newIndex = this.currentAdapterIndex[dataType];
    const newAdapterName = priorities[newIndex];

    console.log(
      `[APIManager] Rotated ${dataType} adapter: ${oldAdapterName} -> ${newAdapterName}`
    );

    return this.getCurrentAdapter(dataType);
  }

  /**
   * Execute API call with fallback logic
   */
  async executeWithFallback(dataType, method, ...args) {
    const priorities = this.adapterPriorities[dataType];
    if (!priorities || priorities.length === 0) {
      throw new Error(`No adapters configured for data type: ${dataType}`);
    }

    let lastError = null;

    // Try all adapters in priority order
    for (let i = 0; i < priorities.length; i++) {
      const adapterName = priorities[i];
      const adapter = this.adapters[adapterName];

      if (!adapter || !adapter.supports(dataType)) {
        continue;
      }

      // Skip unhealthy adapters (but still try if it's the last option)
      if (!this.isAdapterHealthy(adapterName) && i < priorities.length - 1) {
        console.log(`[APIManager] Skipping unhealthy adapter: ${adapterName}`);
        continue;
      }

      try {
        console.log(
          `[APIManager] Attempting ${dataType} call using ${adapterName}`
        );
        this.recordAttempt(adapterName);

        const result = await adapter[method](...args);

        this.recordSuccess(adapterName);
        console.log(
          `[APIManager] Successfully fetched ${dataType} data from ${adapterName}`
        );

        return { data: result, source: adapterName };
      } catch (error) {
        console.log(
          `[APIManager] ${adapterName} failed for ${dataType}:`,
          error.message
        );
        this.recordFailure(adapterName, error);
        lastError = error;
      }
    }

    // All adapters failed
    throw new Error(
      `All adapters failed for ${dataType}. Last error: ${lastError?.message}`
    );
  }

  /**
   * Fetch market data with rotation and fallback
   */
  async getMarketData() {
    // First try current adapter
    try {
      const { adapter, name } = this.getCurrentAdapter('market');
      this.recordAttempt(name);
      const result = await adapter.getMarketData();
      this.recordSuccess(name);

      // Rotate for next time
      this.rotateAdapter('market');

      return { data: result, source: name };
    } catch (error) {
      const { name } = this.getCurrentAdapter('market');
      this.recordFailure(name, error);

      // Try fallback
      return this.executeWithFallback('market', 'getMarketData');
    }
  }

  /**
   * Fetch OHLC data with rotation and fallback
   */
  async getOHLCData(timeframe) {
    // First try current adapter
    try {
      const { adapter, name } = this.getCurrentAdapter('ohlc');
      this.recordAttempt(name);
      const result = await adapter.getOHLCData(timeframe);
      this.recordSuccess(name);

      // Rotate for next time
      this.rotateAdapter('ohlc');

      return { data: result, source: name };
    } catch (error) {
      const { name } = this.getCurrentAdapter('ohlc');
      this.recordFailure(name, error);

      // Try fallback
      return this.executeWithFallback('ohlc', 'getOHLCData', timeframe);
    }
  }

  /**
   * Fetch blockchain data with fallback
   */
  async getBlockchainData() {
    return this.executeWithFallback('blockchain', 'getBlockchainData');
  }

  /**
   * Fetch supply data with rotation and fallback
   */
  async getSupplyData() {
    // First try current adapter
    try {
      const { adapter, name } = this.getCurrentAdapter('supply');
      this.recordAttempt(name);
      const result = await adapter.getSupplyData();
      this.recordSuccess(name);

      // Rotate for next time
      this.rotateAdapter('supply');

      return { data: result, source: name };
    } catch (error) {
      const { name } = this.getCurrentAdapter('supply');
      this.recordFailure(name, error);

      // Try fallback
      return this.executeWithFallback('supply', 'getSupplyData');
    }
  }

  /**
   * Fetch global market data with fallback
   */
  async getGlobalMarketData() {
    return this.executeWithFallback('global', 'getGlobalMarketData');
  }

  /**
   * Record an API attempt with overflow protection
   */
  recordAttempt(adapterName) {
    if (this.adapterHealth[adapterName]) {
      const health = this.adapterHealth[adapterName];

      // Check for overflow and reset if necessary
      if (health.totalRequests >= MAX_SAFE_COUNTER) {
        this.resetAdapterCounters(adapterName);
      }

      health.totalRequests++;
    }
  }

  /**
   * Record a successful API call
   */
  recordSuccess(adapterName) {
    if (this.adapterHealth[adapterName]) {
      const health = this.adapterHealth[adapterName];
      health.successfulRequests++;
      health.consecutiveFailures = 0;
      health.lastSuccess = new Date().toISOString();
      health.healthy = true;
    }
  }

  /**
   * Record a failed API call
   */
  recordFailure(adapterName, error) {
    if (this.adapterHealth[adapterName]) {
      const health = this.adapterHealth[adapterName];
      health.consecutiveFailures++;
      health.lastFailure = new Date().toISOString();
      health.lastError = error.message;

      // Mark as unhealthy after 3 consecutive failures
      if (health.consecutiveFailures >= 3) {
        health.healthy = false;
        console.warn(
          `[APIManager] Marking ${adapterName} as unhealthy after ${health.consecutiveFailures} consecutive failures`
        );
      }
    }
  }

  /**
   * Reset counters for a specific adapter
   */
  resetAdapterCounters(adapterName) {
    if (this.adapterHealth[adapterName]) {
      const health = this.adapterHealth[adapterName];
      const successRate =
        health.totalRequests > 0
          ? health.successfulRequests / health.totalRequests
          : 0;

      health.totalRequests = 1000;
      health.successfulRequests = Math.floor(1000 * successRate);
      health.lastCounterReset = Date.now();

      console.log(
        `[APIManager] Reset counters for ${adapterName} (success rate preserved: ${(successRate * 100).toFixed(1)}%)`
      );
    }
  }

  /**
   * Check if an adapter is healthy
   */
  isAdapterHealthy(adapterName) {
    return this.adapterHealth[adapterName]?.healthy ?? true;
  }

  /**
   * Get health status for all adapters
   */
  getHealthStatus() {
    const status = {};

    Object.keys(this.adapters).forEach((name) => {
      const adapter = this.adapters[name];
      const health = this.adapterHealth[name];

      status[name] = {
        ...adapter.getHealthStatus(),
        ...health,
        supportedDataTypes: adapter.getSupportedDataTypes(),
        successRate:
          health.totalRequests > 0
            ? (
                (health.successfulRequests / health.totalRequests) *
                100
              ).toFixed(1) + '%'
            : 'N/A',
        memoryInfo: {
          lastCounterReset: health.lastCounterReset,
          counterResetAge: Date.now() - health.lastCounterReset,
        },
      };
    });

    return {
      adapters: status,
      memoryManagement: {
        lastMemoryCleanup: this.lastMemoryCleanup,
        lastHealthReset: this.lastHealthReset,
        memoryCleanupAge: Date.now() - this.lastMemoryCleanup,
        healthResetAge: Date.now() - this.lastHealthReset,
      },
    };
  }

  /**
   * Reset health status for all adapters
   */
  resetHealth() {
    this.initializeHealthTracking();
    console.log('[APIManager] Reset health status for all adapters');
  }

  /**
   * Manual memory cleanup trigger
   */
  forceMemoryCleanup() {
    this.performMemoryCleanup();
    this.performHealthReset();
    console.log('[APIManager] Forced memory cleanup completed');
  }
}

module.exports = APIManager;
