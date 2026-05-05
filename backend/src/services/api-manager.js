const CoinGeckoAdapter = require('../adapters/coingecko-adapter');
const BlockstreamAdapter = require('../adapters/blockstream-adapter');
const CoinCapAdapter = require('../adapters/coincap-adapter');
const BinanceAdapter = require('../adapters/binance-adapter');

const MAX_SAFE_COUNTER = Number.MAX_SAFE_INTEGER - 10000;
const COUNTER_RESET_THRESHOLD = 1_000_000;
const HEALTH_RESET_INTERVAL = 24 * 60 * 60 * 1000;
const MEMORY_CLEANUP_INTERVAL = 60 * 60 * 1000;

class APIManager {
  constructor() {
    this.adapters = {
      coingecko: new CoinGeckoAdapter(),
      blockstream: new BlockstreamAdapter(),
      coincap: new CoinCapAdapter(),
      binance: new BinanceAdapter(),
    };

    this.adapterPriorities = {
      market: ['binance', 'coingecko', 'coincap'],
      ohlc: ['binance', 'coingecko'],
      blockchain: ['blockstream'],
      supply: ['coingecko', 'coincap'],
      global: ['coingecko'],
    };

    this.adapterHealth = {};
    this.initializeHealthTracking();

    this.lastMemoryCleanup = Date.now();
    this.lastHealthReset = Date.now();
    this.cleanupInterval = null;
    this.healthInterval = null;
    this.setupMemoryManagement();
  }

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

  setupMemoryManagement() {
    this.cleanupInterval = setInterval(
      () => this.performMemoryCleanup(),
      MEMORY_CLEANUP_INTERVAL
    );
    this.healthInterval = setInterval(
      () => this.performHealthReset(),
      HEALTH_RESET_INTERVAL
    );
  }

  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
  }

  performMemoryCleanup() {
    const now = Date.now();
    let cleaned = 0;

    Object.keys(this.adapterHealth).forEach((name) => {
      const health = this.adapterHealth[name];
      if (health.totalRequests > COUNTER_RESET_THRESHOLD) {
        const successRate =
          health.totalRequests > 0
            ? health.successfulRequests / health.totalRequests
            : 0;
        health.totalRequests = 1000;
        health.successfulRequests = Math.floor(1000 * successRate);
        health.lastCounterReset = now;
        cleaned++;
      }
    });

    if (global.gc && cleaned > 0) global.gc();
    this.lastMemoryCleanup = now;
  }

  performHealthReset() {
    const now = Date.now();
    Object.keys(this.adapterHealth).forEach((name) => {
      const health = this.adapterHealth[name];
      if (
        health.lastFailure &&
        now - new Date(health.lastFailure).getTime() > 60 * 60 * 1000
      ) {
        health.consecutiveFailures = 0;
        health.healthy = true;
      }
    });
    this.lastHealthReset = now;
  }

  async executeWithFallback(dataType, method, ...args) {
    const priorities = this.adapterPriorities[dataType];
    if (!priorities || priorities.length === 0) {
      throw new Error(`No adapters configured for ${dataType}`);
    }

    let lastError = null;

    for (let i = 0; i < priorities.length; i++) {
      const adapterName = priorities[i];
      const adapter = this.adapters[adapterName];

      if (!adapter || !adapter.supports(dataType)) continue;

      // Skip unhealthy unless final option
      if (!this.isAdapterHealthy(adapterName) && i < priorities.length - 1) {
        continue;
      }

      try {
        this.recordAttempt(adapterName);
        const result = await adapter[method](...args);
        this.recordSuccess(adapterName);
        return { data: result, source: adapterName };
      } catch (error) {
        this.recordFailure(adapterName, error);
        lastError = error;
      }
    }

    throw new Error(
      `All adapters failed for ${dataType}. Last: ${lastError?.message}`
    );
  }

  async getMarketData() {
    return this.executeWithFallback('market', 'getMarketData');
  }

  async getOHLCData(timeframe) {
    return this.executeWithFallback('ohlc', 'getOHLCData', timeframe);
  }

  async getBlockchainData() {
    return this.executeWithFallback('blockchain', 'getBlockchainData');
  }

  async getSupplyData() {
    return this.executeWithFallback('supply', 'getSupplyData');
  }

  async getGlobalMarketData() {
    return this.executeWithFallback('global', 'getGlobalMarketData');
  }

  recordAttempt(adapterName) {
    const health = this.adapterHealth[adapterName];
    if (!health) return;
    if (health.totalRequests >= MAX_SAFE_COUNTER) {
      this.resetAdapterCounters(adapterName);
    }
    health.totalRequests++;
  }

  recordSuccess(adapterName) {
    const health = this.adapterHealth[adapterName];
    if (!health) return;
    health.successfulRequests++;
    health.consecutiveFailures = 0;
    health.lastSuccess = new Date().toISOString();
    health.healthy = true;
  }

  recordFailure(adapterName, error) {
    const health = this.adapterHealth[adapterName];
    if (!health) return;
    health.consecutiveFailures++;
    health.lastFailure = new Date().toISOString();
    health.lastError = error.message;
    if (health.consecutiveFailures >= 3) {
      health.healthy = false;
    }
  }

  resetAdapterCounters(adapterName) {
    const health = this.adapterHealth[adapterName];
    if (!health) return;
    const successRate =
      health.totalRequests > 0
        ? health.successfulRequests / health.totalRequests
        : 0;
    health.totalRequests = 1000;
    health.successfulRequests = Math.floor(1000 * successRate);
    health.lastCounterReset = Date.now();
  }

  isAdapterHealthy(adapterName) {
    return this.adapterHealth[adapterName]?.healthy ?? true;
  }

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
      };
    });

    return {
      adapters: status,
      memoryManagement: {
        lastMemoryCleanup: this.lastMemoryCleanup,
        lastHealthReset: this.lastHealthReset,
      },
    };
  }

  forceMemoryCleanup() {
    this.performMemoryCleanup();
    this.performHealthReset();
  }
}

module.exports = APIManager;
