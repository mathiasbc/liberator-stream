const axios = require('axios');
const BaseAdapter = require('./base-adapter');
const {
  getTimeframeConfig,
  getTimeframeBucket,
} = require('../config/timeframes');

class CoinGeckoAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('CoinGecko', {
      rateLimitDelay: 1000,
      maxRetries: 3,
      ...config,
    });

    this.baseUrl = 'https://api.coingecko.com/api/v3';
    this.bitcoinId = 'bitcoin';
  }

  async getMarketData() {
    return this.executeWithRetry(async () => {
      const url = `${this.baseUrl}/simple/price?ids=${this.bitcoinId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
      const response = await axios.get(url);

      const data = response.data[this.bitcoinId];
      if (!data) {
        throw new Error('No market data received for Bitcoin');
      }

      return {
        currentPrice: data.usd || 0,
        priceChange: data.usd_24h_change || 0,
        volume: data.usd_24h_vol || 0,
        marketCap: data.usd_market_cap || 0,
      };
    });
  }

  async getOHLCData(timeframe) {
    const config = getTimeframeConfig(timeframe, 'coingecko');

    return this.executeWithRetry(async () => {
      const url = `${this.baseUrl}/coins/${this.bitcoinId}/market_chart?vs_currency=usd&days=${config.days}`;
      const response = await axios.get(url);

      const prices = response.data.prices || [];
      const volumes = response.data.total_volumes || [];

      // Sort price data by timestamp for proper sequencing
      const sortedPrices = prices
        .map((price, index) => ({
          timestamp: Math.floor(price[0] / 1000),
          price: parseFloat(price[1]),
          volume: parseFloat((volumes[index] || [0, 0])[1]) || 0,
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      // Group into time intervals using centralized bucketing
      const groupedData = {};

      sortedPrices.forEach((item) => {
        const groupKey = getTimeframeBucket(item.timestamp, timeframe);

        if (!groupedData[groupKey]) {
          groupedData[groupKey] = {
            time: groupKey,
            prices: [],
            volumes: [],
          };
        }

        groupedData[groupKey].prices.push(item.price);
        groupedData[groupKey].volumes.push(item.volume);
      });

      // Convert grouped data to proper OHLC format
      const sortedGroups = Object.values(groupedData).sort(
        (a, b) => a.time - b.time
      );
      const rawData = [];
      let previousClose = null;

      sortedGroups.forEach((group) => {
        const prices = group.prices;
        const volumes = group.volumes;

        if (prices.length === 0) return;

        const open = previousClose !== null ? previousClose : prices[0];
        const close = prices[prices.length - 1];
        const high = Math.max(...prices);
        const low = Math.min(...prices);

        const finalHigh = Math.max(high, open, close);
        const finalLow = Math.min(low, open, close);

        const candle = {
          time: group.time,
          open: open,
          high: finalHigh,
          low: finalLow,
          close: close,
          volume: volumes.reduce((sum, vol) => sum + vol, 0),
        };

        rawData.push(candle);
        previousClose = close;
      });

      return this.cleanAndSortData(rawData, config.maxCandles);
    });
  }

  async getSupplyData() {
    return this.executeWithRetry(async () => {
      const url = `${this.baseUrl}/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
      const response = await axios.get(url);

      const marketData = response.data.market_data;
      const totalSupply = marketData.total_supply;
      const maxSupply = marketData.max_supply;

      return {
        totalSupply: {
          current: totalSupply,
          max: maxSupply,
          percentage: ((totalSupply / maxSupply) * 100).toFixed(2),
        },
        extendedSupplyData: {
          current: totalSupply,
          max: maxSupply,
          percentage: ((totalSupply / maxSupply) * 100).toFixed(2),
          circulatingSupply: marketData.circulating_supply,
          athPrice: marketData.ath.usd,
          athDate: marketData.ath_date.usd,
          atlPrice: marketData.atl.usd,
          atlDate: marketData.atl_date.usd,
          priceChangePercentageFromAth:
            marketData.ath_change_percentage.usd?.toFixed(2),
          marketCapRank: response.data.market_cap_rank,
          liquidityScore: response.data.liquidity_score,
        },
      };
    });
  }

  async getGlobalMarketData() {
    return this.executeWithRetry(async () => {
      const url = `${this.baseUrl}/global`;
      const response = await axios.get(url);
      const globalData = response.data.data;

      return {
        marketDominance: globalData.market_cap_percentage.btc
          ? globalData.market_cap_percentage.btc.toFixed(1)
          : null,
        globalMarketData: {
          btcDominance: globalData.market_cap_percentage.btc
            ? globalData.market_cap_percentage.btc.toFixed(1)
            : null,
          totalMarketCap: globalData.total_market_cap.usd || 0,
          totalVolume: globalData.total_volume.usd || 0,
          activeCryptocurrencies: globalData.active_cryptocurrencies || 0,
          marketCapChangePercentage:
            globalData.market_cap_change_percentage_24h_usd || 0,
        },
      };
    });
  }

  // CoinGecko doesn't provide blockchain data - this will throw an error
  async getBlockchainData() {
    throw new Error(`${this.name} adapter does not support blockchain data`);
  }

  cleanAndSortData(data, maxCandles = null) {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Remove invalid entries and ensure proper numeric values
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

    // Sort by time in ascending order
    validData.sort((a, b) => a.time - b.time);

    // Deduplicate
    const deduplicated = [];
    let lastTime = -1;

    for (const item of validData) {
      if (item.time > lastTime) {
        deduplicated.push(item);
        lastTime = item.time;
      }
    }

    // Limit to the most recent maxCandles if specified
    let finalData = deduplicated;
    if (maxCandles && deduplicated.length > maxCandles) {
      finalData = deduplicated.slice(-maxCandles);
    }

    return finalData;
  }

  getSupportedDataTypes() {
    return ['market', 'ohlc', 'supply', 'global'];
  }
}

module.exports = CoinGeckoAdapter;
