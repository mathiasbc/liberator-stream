const axios = require('axios');
const BaseAdapter = require('./base-adapter');
const { getTimeframeConfig } = require('../config/timeframes');

class BinanceAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('Binance', {
      rateLimitDelay: 100, // Binance has high rate limits for public endpoints
      maxRetries: 3,
      ...config,
    });

    // data-api.binance.vision is Binance's official public market-data
    // mirror. It serves the same /api/v3 endpoints with no auth and no
    // geo restrictions (api.binance.com returns 451 in some regions).
    this.baseUrl = 'https://data-api.binance.vision/api/v3';
    this.symbol = 'BTCUSDT';
  }

  async getMarketData() {
    return this.executeWithRetry(async () => {
      const [tickerResponse, priceResponse] = await Promise.all([
        axios.get(`${this.baseUrl}/ticker/24hr?symbol=${this.symbol}`),
        axios.get(`${this.baseUrl}/ticker/price?symbol=${this.symbol}`),
      ]);

      const ticker = tickerResponse.data;
      const price = priceResponse.data;

      // Binance has no market cap endpoint — omit the field so the cache
      // keeps the last good value from CoinGecko / supply×price fallback.
      return {
        currentPrice: parseFloat(price.price) || 0,
        priceChange: parseFloat(ticker.priceChangePercent) || 0,
        volume: parseFloat(ticker.quoteVolume) || 0,
        dayOpen: parseFloat(ticker.openPrice) || 0,
        dayHigh: parseFloat(ticker.highPrice) || 0,
        dayLow: parseFloat(ticker.lowPrice) || 0,
        dayClose: parseFloat(ticker.lastPrice) || parseFloat(price.price) || 0,
      };
    });
  }

  async getOHLCData(timeframe) {
    const config = getTimeframeConfig(timeframe, 'binance');

    return this.executeWithRetry(async () => {
      const url = `${this.baseUrl}/klines?symbol=${this.symbol}&interval=${config.interval}&limit=${config.limit}`;
      const response = await axios.get(url);

      const data = response.data || [];

      // Binance klines format: [openTime, open, high, low, close, volume, closeTime, ...]
      const candles = data.map((kline) => ({
        time: Math.floor(kline[0] / 1000), // Convert to seconds
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));

      return this.cleanAndSortData(candles);
    });
  }

  // Binance doesn't provide supply data
  async getSupplyData() {
    throw new Error(`${this.name} adapter does not support supply data`);
  }

  // Binance doesn't provide global market data
  async getGlobalMarketData() {
    throw new Error(`${this.name} adapter does not support global market data`);
  }

  // Binance doesn't provide blockchain data
  async getBlockchainData() {
    throw new Error(`${this.name} adapter does not support blockchain data`);
  }

  cleanAndSortData(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Remove invalid entries
    const validData = data.filter(
      (item) =>
        item &&
        typeof item.time === 'number' &&
        !isNaN(item.time) &&
        item.time > 0 &&
        typeof item.open === 'number' &&
        typeof item.high === 'number' &&
        typeof item.low === 'number' &&
        typeof item.close === 'number'
    );

    // Sort by time
    validData.sort((a, b) => a.time - b.time);

    // Binance data is already limited by the API call
    return validData;
  }

  getSupportedDataTypes() {
    return ['market', 'ohlc'];
  }
}

module.exports = BinanceAdapter;
