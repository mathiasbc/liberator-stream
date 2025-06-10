const coingecko = require('../services/coingecko');
const blockchaininfo = require('../services/blockchaininfo');
const websocketServer = require('../websocket/server');

const UPDATE_INTERVAL = {
  MARKET_DATA_MS: 30000, // 30s
  OHLC_SHORT_MS: 30000, // 30s - for 5M, 1H
  OHLC_MEDIUM_MS: 120000, // 2min - for 4H
  OHLC_LONG_MS: 300000, // 5min - for 1D, 1W
  BLOCKCHAIN_DATA_MS: 30000, // 30s
};

class Scheduler {
  constructor() {
    this._cache = {};
    this._updateCycle = 0; // Track update cycles for staggered updates
  }

  start() {
    this.updateAllData();
    // Staggered updates to reduce API load
    setInterval(() => {
      this._updateCycle++;
      this.updateCriticalData(); // Market data + short timeframes every 30s

      // Medium timeframes every 2 minutes (4 cycles)
      if (this._updateCycle % 4 === 0) {
        this.updateMediumTimeframes();
      }

      // Long timeframes every 5 minutes (10 cycles)
      if (this._updateCycle % 10 === 0) {
        this.updateLongTimeframes();
      }
    }, UPDATE_INTERVAL.MARKET_DATA_MS);
  }

  async updateCriticalData() {
    try {
      console.log('Updating critical data (market + short timeframes)...');

      // Fetch critical data: market, short timeframes, blockchain
      const [market, shortOhlc, blockchainData] = await Promise.allSettled([
        this.fetchMarketData(),
        this.fetchShortTimeframeOHLC(),
        this.fetchBlockchainData(),
      ]);

      // Combine all data into cache
      let hasUpdates = false;
      const newCache = { ...this._cache };

      if (
        market.status === 'fulfilled' &&
        market.value &&
        market.value.currentPrice
      ) {
        Object.assign(newCache, market.value);
        hasUpdates = true;
        console.log('Market data updated');
      } else if (market.status === 'rejected') {
        console.error('Market data fetch failed:', market.reason);
      }

      if (
        shortOhlc.status === 'fulfilled' &&
        shortOhlc.value &&
        Object.keys(shortOhlc.value).length > 0
      ) {
        newCache.ohlcData = { ...this._cache.ohlcData, ...shortOhlc.value };
        hasUpdates = true;
        console.log('Short timeframe OHLC data updated');
      } else if (shortOhlc.status === 'rejected') {
        console.error(
          'Short timeframe OHLC data fetch failed:',
          shortOhlc.reason
        );
      }

      if (
        blockchainData.status === 'fulfilled' &&
        blockchainData.value &&
        blockchainData.value.blockHeight &&
        blockchainData.value.marketDominance &&
        blockchainData.value.totalSupply
      ) {
        Object.assign(newCache, blockchainData.value);
        hasUpdates = true;
        console.log('Blockchain data updated');
      } else if (blockchainData.status === 'rejected') {
        console.error('Blockchain data fetch failed:', blockchainData.reason);
      }

      // Send single update with all data
      if (hasUpdates) {
        this._cache = newCache;
        websocketServer.updateData(this._cache);
        console.log('Critical data updated and broadcasted');
      } else {
        console.warn('No data updates available');
      }
    } catch (e) {
      console.error('Error updating critical data:', e.message);
    }
  }

  async updateMediumTimeframes() {
    try {
      console.log('Updating medium timeframes (4H)...');
      const mediumOhlc = await this.fetchMediumTimeframeOHLC();

      if (mediumOhlc && Object.keys(mediumOhlc).length > 0) {
        this._cache.ohlcData = { ...this._cache.ohlcData, ...mediumOhlc };
        websocketServer.updateData(this._cache);
        console.log('Medium timeframe OHLC data updated');
      }
    } catch (e) {
      console.error('Error updating medium timeframes:', e.message);
    }
  }

  async updateLongTimeframes() {
    try {
      console.log('Updating long timeframes (1D, 1W)...');
      const longOhlc = await this.fetchLongTimeframeOHLC();

      if (longOhlc && Object.keys(longOhlc).length > 0) {
        this._cache.ohlcData = { ...this._cache.ohlcData, ...longOhlc };
        websocketServer.updateData(this._cache);
        console.log('Long timeframe OHLC data updated');
      }
    } catch (e) {
      console.error('Error updating long timeframes:', e.message);
    }
  }

  // Initial data fetch for first load
  async updateAllData() {
    try {
      console.log('Initial data fetch - loading all timeframes...');

      const [market, allOhlc, blockchainData] = await Promise.allSettled([
        this.fetchMarketData(),
        this.fetchAllTimeframeOHLC(),
        this.fetchBlockchainData(),
      ]);

      let hasUpdates = false;
      const newCache = { ...this._cache };

      if (
        market.status === 'fulfilled' &&
        market.value &&
        market.value.currentPrice
      ) {
        Object.assign(newCache, market.value);
        hasUpdates = true;
      }

      if (
        allOhlc.status === 'fulfilled' &&
        allOhlc.value &&
        Object.keys(allOhlc.value).length > 0
      ) {
        newCache.ohlcData = allOhlc.value;
        hasUpdates = true;
      }

      if (
        blockchainData.status === 'fulfilled' &&
        blockchainData.value &&
        blockchainData.value.blockHeight &&
        blockchainData.value.marketDominance &&
        blockchainData.value.totalSupply
      ) {
        Object.assign(newCache, blockchainData.value);
        hasUpdates = true;
      }

      if (hasUpdates) {
        this._cache = newCache;
        websocketServer.updateData(this._cache);
        console.log('Initial data loaded and broadcasted');
      }
    } catch (e) {
      console.error('Error in initial data fetch:', e.message);
    }
  }

  async fetchMarketData() {
    const market = await coingecko.getMarketData();
    return market;
  }

  async fetchShortTimeframeOHLC() {
    const timeframes = ['5M', '1H'];
    return this.fetchOHLCForTimeframes(timeframes);
  }

  async fetchMediumTimeframeOHLC() {
    const timeframes = ['4H'];
    return this.fetchOHLCForTimeframes(timeframes);
  }

  async fetchLongTimeframeOHLC() {
    const timeframes = ['1D', '1W'];
    return this.fetchOHLCForTimeframes(timeframes);
  }

  async fetchAllTimeframeOHLC() {
    const timeframes = ['5M', '1H', '4H', '1D', '1W'];
    return this.fetchOHLCForTimeframes(timeframes);
  }

  async fetchOHLCForTimeframes(timeframes) {
    const ohlcData = {};

    // Add delays between requests to avoid rate limiting
    const ohlcPromises = timeframes.map(async (timeframe) => {
      try {
        // Add 200ms delay between each request
        await new Promise((resolve) => setTimeout(resolve, 200));
        const data = await coingecko.getOHLC(timeframe);
        return { timeframe, data };
      } catch (error) {
        console.error(`Error fetching OHLC for ${timeframe}:`, error.message);
        return { timeframe, data: null };
      }
    });

    const results = await Promise.allSettled(ohlcPromises);

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.data) {
        ohlcData[result.value.timeframe] = result.value.data;
      }
    });

    return ohlcData;
  }

  async fetchBlockchainData() {
    const [blockHeight, marketDominance, totalSupply] = await Promise.all([
      blockchaininfo.getBlockHeight(),
      blockchaininfo.getMarketDominance(),
      blockchaininfo.getTotalSupply(),
    ]);
    return { blockHeight, marketDominance, totalSupply };
  }
}

module.exports = new Scheduler();
