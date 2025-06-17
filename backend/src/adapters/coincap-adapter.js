const axios = require('axios');
const BaseAdapter = require('./base-adapter');
// const { getTimeframeConfig } = require('../config/timeframes'); // Not used in GraphQL implementation

class CoinCapAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('CoinCap', {
      rateLimitDelay: 200, // CoinCap has generous rate limits
      maxRetries: 3,
      ...config,
    });

    this.baseUrl = 'https://api.coincap.io/v3';
    this.bitcoinId = 'bitcoin';
  }

  async getMarketData() {
    return this.executeWithRetry(async () => {
      const query = {
        query: `{
          assets(first: 10) {
            edges {
              node {
                id
                name
                symbol
                priceUsd
                changePercent24Hr
                volumeUsd24Hr
                marketCapUsd
              }
            }
          }
        }`,
      };

      const response = await axios.post('https://graphql.coincap.io', query, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const assets = response.data.data?.assets?.edges || [];
      const bitcoinAsset = assets.find(
        (edge) => edge.node.id === this.bitcoinId
      );

      if (!bitcoinAsset) {
        throw new Error('No market data received for Bitcoin from CoinCap');
      }

      const data = bitcoinAsset.node;
      return {
        currentPrice: parseFloat(data.priceUsd) || 0,
        priceChange: parseFloat(data.changePercent24Hr) || 0,
        volume: parseFloat(data.volumeUsd24Hr) || 0,
        marketCap: parseFloat(data.marketCapUsd) || 0,
      };
    });
  }

  async getOHLCData() {
    // CoinCap GraphQL API doesn't currently support historical OHLC data
    // This would need to be implemented when they add historical data support
    throw new Error(
      `${this.name} adapter does not currently support OHLC data in GraphQL API`
    );
  }

  // CoinCap doesn't provide supply data in the same format
  async getSupplyData() {
    return this.executeWithRetry(async () => {
      const query = {
        query: `{
          assets(first: 10) {
            edges {
              node {
                id
                name
                symbol
                supply
                rank
              }
            }
          }
        }`,
      };

      const response = await axios.post('https://graphql.coincap.io', query, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const assets = response.data.data?.assets?.edges || [];
      const bitcoinAsset = assets.find(
        (edge) => edge.node.id === this.bitcoinId
      );

      if (!bitcoinAsset) {
        throw new Error('No supply data received for Bitcoin from CoinCap');
      }

      const data = bitcoinAsset.node;
      const current = parseFloat(data.supply);
      const max = 21000000; // Bitcoin max supply is hardcoded

      return {
        totalSupply: {
          current: current,
          max: max,
          percentage: ((current / max) * 100).toFixed(2),
        },
        extendedSupplyData: {
          current: current,
          max: max,
          percentage: ((current / max) * 100).toFixed(2),
          circulatingSupply: current, // CoinCap's supply is circulating supply
          athPrice: null, // Not available
          athDate: null,
          atlPrice: null,
          atlDate: null,
          priceChangePercentageFromAth: null,
          marketCapRank: parseInt(data.rank) || null,
          liquidityScore: null,
        },
      };
    });
  }

  // CoinCap doesn't provide global market data
  async getGlobalMarketData() {
    throw new Error(`${this.name} adapter does not support global market data`);
  }

  // CoinCap doesn't provide blockchain data
  async getBlockchainData() {
    throw new Error(`${this.name} adapter does not support blockchain data`);
  }

  cleanAndSortData(data, maxCandles = null) {
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

    // Limit to maxCandles
    let finalData = validData;
    if (maxCandles && validData.length > maxCandles) {
      finalData = validData.slice(-maxCandles);
    }

    return finalData;
  }

  getSupportedDataTypes() {
    return ['market', 'supply'];
  }
}

module.exports = CoinCapAdapter;
