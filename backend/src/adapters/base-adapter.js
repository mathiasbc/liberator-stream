/**
 * Abstract base class for API adapters
 * All API adapters must implement these methods
 */
class BaseAdapter {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.rateLimitDelay = config.rateLimitDelay || 1000;
    this.maxRetries = config.maxRetries || 3;
    this.lastRequestTime = 0;
  }

  /**
   * Enforce rate limiting
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`[${this.name}] Rate limiting: waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Execute API call with retry logic
   */
  async executeWithRetry(apiCall, retries = this.maxRetries) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.enforceRateLimit();
        const result = await apiCall();
        console.log(`[${this.name}] API call successful on attempt ${attempt}`);
        return result;
      } catch (error) {
        console.log(
          `[${this.name}] API call failed on attempt ${attempt}:`,
          error.message
        );

        if (attempt === retries) {
          throw error;
        }

        // Exponential backoff
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`[${this.name}] Retrying in ${backoffDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }

  /**
   * Abstract methods that must be implemented by concrete adapters
   */

  /**
   * Fetch current market data (price, volume, market cap, price change)
   * @returns {Promise<Object>} Market data object
   */
  async getMarketData() {
    throw new Error(`${this.name} adapter must implement getMarketData()`);
  }

  /**
   * Fetch OHLC data for a specific timeframe
   * @param {string} timeframe - Timeframe (5M, 1H, 4H, 1D, 1W)
   * @returns {Promise<Array>} Array of OHLC candles
   */
  async getOHLCData() {
    throw new Error(
      `${this.name} adapter must implement getOHLCData(timeframe)`
    );
  }

  /**
   * Fetch blockchain-specific data (block height, network metrics)
   * @returns {Promise<Object>} Blockchain data object
   */
  async getBlockchainData() {
    throw new Error(`${this.name} adapter must implement getBlockchainData()`);
  }

  /**
   * Fetch supply data (total supply, circulating supply, etc.)
   * @returns {Promise<Object>} Supply data object
   */
  async getSupplyData() {
    throw new Error(`${this.name} adapter must implement getSupplyData()`);
  }

  /**
   * Fetch global market data (dominance, total market cap, etc.)
   * @returns {Promise<Object>} Global market data object
   */
  async getGlobalMarketData() {
    throw new Error(
      `${this.name} adapter must implement getGlobalMarketData()`
    );
  }

  /**
   * Check if this adapter supports a specific data type
   * @param {string} dataType - Type of data (market, ohlc, blockchain, supply, global)
   * @returns {boolean} Whether this adapter supports the data type
   */
  supports(dataType) {
    const supportedTypes = this.getSupportedDataTypes();
    return supportedTypes.includes(dataType);
  }

  /**
   * Get list of supported data types for this adapter
   * @returns {Array<string>} Array of supported data types
   */
  getSupportedDataTypes() {
    return ['market', 'ohlc', 'blockchain', 'supply', 'global'];
  }

  /**
   * Get adapter health status
   * @returns {Object} Health status object
   */
  getHealthStatus() {
    return {
      name: this.name,
      healthy: true,
      lastRequestTime: this.lastRequestTime,
      rateLimitDelay: this.rateLimitDelay,
    };
  }
}

module.exports = BaseAdapter;
