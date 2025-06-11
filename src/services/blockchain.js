const COINGECKO_BASE = '/api/v3';
const BLOCKSTREAM_BASE = 'https://blockstream.info/api';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class BlockchainService {
  async getBlockHeight() {
    try {
      await delay(2000);
      const url = `${BLOCKSTREAM_BASE}/blocks/tip/height`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.text();
      return parseInt(data, 10);
    } catch (error) {
      console.error('Error fetching block height:', error);
      throw error;
    }
  }

  async getMarketDominance() {
    try {
      await delay(2000);
      const url = `${COINGECKO_BASE}/global`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const globalData = data.data;

      return {
        btcDominance: globalData.market_cap_percentage.btc
          ? globalData.market_cap_percentage.btc.toFixed(1)
          : null,
        totalMarketCap: globalData.total_market_cap.usd || 0,
        totalVolume: globalData.total_volume.usd || 0,
        activeCryptocurrencies: globalData.active_cryptocurrencies || 0,
        marketCapChangePercentage:
          globalData.market_cap_change_percentage_24h_usd || 0,
      };
    } catch (error) {
      console.error('Error fetching market dominance:', error);
      throw error;
    }
  }

  async getTotalSupply() {
    try {
      await delay(2000);
      const url = `${COINGECKO_BASE}/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const marketData = data.market_data;
      const totalSupply = marketData.total_supply;
      const maxSupply = marketData.max_supply;

      return {
        current: totalSupply,
        max: maxSupply,
        percentage: ((totalSupply / maxSupply) * 100).toFixed(2),
        // Additional useful metrics from the same API call
        circulatingSupply: marketData.circulating_supply,
        athPrice: marketData.ath.usd,
        athDate: marketData.ath_date.usd,
        atlPrice: marketData.atl.usd,
        atlDate: marketData.atl_date.usd,
        priceChangePercentageFromAth:
          marketData.ath_change_percentage.usd?.toFixed(2),
        marketCapRank: data.market_cap_rank,
        liquidityScore: data.liquidity_score,
      };
    } catch (error) {
      console.error('Error fetching total supply:', error);
      throw error;
    }
  }
}

const blockchainService = new BlockchainService();
export default blockchainService;
