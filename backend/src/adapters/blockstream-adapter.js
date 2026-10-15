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
      // /blocks returns the 10 most recent blocks, newest first. Fees and
      // mempool are nice-to-have: if either call fails we still return the tip.
      const [blocksRes, feesRes, mempoolRes] = await Promise.allSettled([
        axios.get(`${this.baseUrl}/blocks`),
        axios.get(`${this.baseUrl}/fee-estimates`),
        axios.get(`${this.baseUrl}/mempool`),
      ]);

      if (blocksRes.status !== 'fulfilled') throw blocksRes.reason;
      const blocks = Array.isArray(blocksRes.value.data)
        ? blocksRes.value.data
        : [];
      const tip = blocks[0];
      if (!tip) throw new Error('Blockstream returned no blocks');

      const oldest = blocks[blocks.length - 1];
      const avgBlockSeconds =
        blocks.length > 1
          ? Math.round((tip.timestamp - oldest.timestamp) / (blocks.length - 1))
          : null;

      // fee-estimates maps confirmation target (in blocks) -> sat/vB
      const est = feesRes.status === 'fulfilled' ? feesRes.value.data : null;
      const fee = (target) =>
        est && typeof est[target] === 'number'
          ? Math.max(1, Math.round(est[target]))
          : null;

      const mempool =
        mempoolRes.status === 'fulfilled' ? mempoolRes.value.data : null;

      return {
        blockHeight: tip.height,
        networkData: {
          lastBlockTime: tip.timestamp,
          lastBlockTxCount: tip.tx_count ?? null,
          avgBlockSeconds,
          fees: {
            fastest: fee('1'),
            halfHour: fee('3'),
            hour: fee('6'),
            economy: fee('144'),
          },
          mempool: {
            count: mempool?.count ?? null,
            vsize: mempool?.vsize ?? null,
          },
        },
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
