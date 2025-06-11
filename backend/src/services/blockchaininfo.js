const axios = require('axios');

// Note: All timestamps from blockchain.info and CoinGecko APIs are in UTC format
// This ensures consistency for YouTube stream viewers across different timezones
const BLOCKCHAIN_BASE =
  process.env.BLOCKCHAIN_INFO_API_URL || 'https://blockchain.info';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const BLOCKSTREAM_BASE = 'https://blockstream.info/api';

class BlockchainInfoService {
  async getBlockHeight() {
    const url = `${BLOCKSTREAM_BASE}/blocks/tip/height`;
    const { data } = await axios.get(url);
    return parseInt(data, 10);
  }

  async getMarketDominance() {
    const url = `${COINGECKO_BASE}/global`;
    const { data } = await axios.get(url);
    const globalData = data.data;
    
    return {
      btcDominance: globalData.market_cap_percentage.btc
        ? globalData.market_cap_percentage.btc.toFixed(1)
        : null,
      totalMarketCap: globalData.total_market_cap.usd || 0,
      totalVolume: globalData.total_volume.usd || 0,
      activeCryptocurrencies: globalData.active_cryptocurrencies || 0,
      marketCapChangePercentage: globalData.market_cap_change_percentage_24h_usd || 0
    };
  }

  async getTotalSupply() {
    const url = `${COINGECKO_BASE}/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    const { data } = await axios.get(url);
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
      priceChangePercentageFromAth: marketData.ath_change_percentage.usd?.toFixed(2),
      marketCapRank: data.market_cap_rank,
      liquidityScore: data.liquidity_score
    };
  }
}

module.exports = new BlockchainInfoService();
