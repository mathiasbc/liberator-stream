const axios = require('axios');
const BaseAdapter = require('./base-adapter');

class BlockstreamAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('Blockstream', {
      rateLimitDelay: 500, // Blockstream is generally more lenient
      maxRetries: 3,
      ...config,
    });

    this.baseUrl = 'https://blockstream.info/api';
  }

  async getBlockchainData() {
    return this.executeWithRetry(async () => {
      const url = `${this.baseUrl}/blocks/tip/height`;
      const response = await axios.get(url);
      const blockHeight = parseInt(response.data, 10);

      return {
        blockHeight,
      };
    });
  }

  // Blockstream doesn't provide market data
  async getMarketData() {
    throw new Error(`${this.name} adapter does not support market data`);
  }

  // Blockstream doesn't provide OHLC data
  async getOHLCData() {
    throw new Error(`${this.name} adapter does not support OHLC data`);
  }

  // Blockstream doesn't provide supply data
  async getSupplyData() {
    throw new Error(`${this.name} adapter does not support supply data`);
  }

  // Blockstream doesn't provide global market data
  async getGlobalMarketData() {
    throw new Error(`${this.name} adapter does not support global market data`);
  }

  getSupportedDataTypes() {
    return ['blockchain'];
  }
}

module.exports = BlockstreamAdapter;
