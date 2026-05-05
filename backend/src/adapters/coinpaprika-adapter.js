const axios = require('axios');
const BaseAdapter = require('./base-adapter');

/**
 * CoinPaprika public API — no key, generous rate limits, less aggressive
 * about blocking cloud-host IPs than CoinGecko. Used as a fallback when
 * CoinGecko returns 429 in production.
 */
class CoinPaprikaAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('CoinPaprika', {
      rateLimitDelay: 1500,
      maxRetries: 3,
      ...config,
    });

    this.baseUrl = 'https://api.coinpaprika.com/v1';
    this.bitcoinId = 'btc-bitcoin';
  }

  async getMarketData() {
    return this.executeWithRetry(async () => {
      const url = `${this.baseUrl}/tickers/${this.bitcoinId}`;
      const { data } = await axios.get(url, { timeout: 10000 });
      const usd = data?.quotes?.USD;
      if (!usd) throw new Error('No USD quote in CoinPaprika response');

      return {
        currentPrice: Number(usd.price) || 0,
        priceChange: Number(usd.percent_change_24h) || 0,
        volume: Number(usd.volume_24h) || 0,
        marketCap: Number(usd.market_cap) || 0,
      };
    });
  }

  async getSupplyData() {
    return this.executeWithRetry(async () => {
      const url = `${this.baseUrl}/tickers/${this.bitcoinId}`;
      const { data } = await axios.get(url, { timeout: 10000 });
      const usd = data?.quotes?.USD;
      // CoinPaprika exposes `total_supply` for BTC (no separate circulating
      // figure; for BTC the two are equivalent post-mining).
      const current =
        Number(data?.circulating_supply) || Number(data?.total_supply) || 0;
      const max = Number(data?.max_supply) || 21_000_000;
      const pct = max > 0 ? ((current / max) * 100).toFixed(2) : null;

      return {
        totalSupply: {
          current,
          max,
          percentage: pct,
        },
        extendedSupplyData: {
          current,
          max,
          percentage: pct,
          circulatingSupply: current,
          athPrice: usd?.ath_price ?? null,
          athDate: usd?.ath_date ?? null,
          atlPrice: null,
          atlDate: null,
          priceChangePercentageFromAth:
            usd?.percent_from_price_ath != null
              ? Number(usd.percent_from_price_ath).toFixed(2)
              : null,
          marketCapRank: data?.rank ?? null,
          liquidityScore: null,
        },
      };
    });
  }

  async getGlobalMarketData() {
    return this.executeWithRetry(async () => {
      const url = `${this.baseUrl}/global`;
      const { data } = await axios.get(url, { timeout: 10000 });

      const dominance =
        data?.bitcoin_dominance_percentage != null
          ? Number(data.bitcoin_dominance_percentage).toFixed(1)
          : null;

      return {
        marketDominance: dominance,
        globalMarketData: {
          btcDominance: dominance,
          totalMarketCap: Number(data?.market_cap_usd) || 0,
          totalVolume: Number(data?.volume_24h_usd) || 0,
          activeCryptocurrencies: Number(data?.cryptocurrencies_number) || 0,
          marketCapChangePercentage:
            Number(data?.market_cap_change_24h) || 0,
        },
      };
    });
  }

  async getOHLCData() {
    throw new Error(`${this.name} adapter does not support OHLC data`);
  }

  async getBlockchainData() {
    throw new Error(`${this.name} adapter does not support blockchain data`);
  }

  getSupportedDataTypes() {
    return ['market', 'supply', 'global'];
  }
}

module.exports = CoinPaprikaAdapter;
