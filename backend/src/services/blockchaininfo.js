const axios = require('axios');

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
    return data.data.market_cap_percentage.btc
      ? data.data.market_cap_percentage.btc.toFixed(1)
      : null;
  }

  async getTotalSupply() {
    const url = `${COINGECKO_BASE}/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    const { data } = await axios.get(url);
    const totalSupply = data.market_data.total_supply;
    const maxSupply = data.market_data.max_supply;
    return {
      current: totalSupply,
      max: maxSupply,
      percentage: ((totalSupply / maxSupply) * 100).toFixed(2),
    };
  }
}

module.exports = new BlockchainInfoService();
