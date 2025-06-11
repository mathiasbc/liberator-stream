const coingecko = require('../services/coingecko');
const blockchaininfo = require('../services/blockchaininfo');
const websocketServer = require('../websocket/server');

const UPDATE_INTERVAL_MS = 60000; // 60s - unified interval for all updates

// Available timeframes for rotation
const TIMEFRAMES = ['5M', '1H', '4H', '1D', '1W'];

class Scheduler {
  constructor() {
    this._cache = {};
    this._currentTimeframeIndex = 0; // Track which timeframe is currently active
    this._updateCycle = 0; // Track update cycles
    this._isUpdating = false; // Prevent overlapping updates
  }

  start() {
    this.updateInitialData();

    // Main update loop - every 60 seconds
    setInterval(() => {
      if (!this._isUpdating) {
        this._updateCycle++;
        this.updateData();
      } else {
        console.log(
          'Skipping update cycle - previous update still in progress'
        );
      }
    }, UPDATE_INTERVAL_MS);
  }

  getCurrentTimeframe() {
    return TIMEFRAMES[this._currentTimeframeIndex];
  }

  rotateTimeframe() {
    const oldTimeframe = this.getCurrentTimeframe();
    this._currentTimeframeIndex =
      (this._currentTimeframeIndex + 1) % TIMEFRAMES.length;
    const newTimeframe = this.getCurrentTimeframe();
    console.log(`Timeframe rotated: ${oldTimeframe} → ${newTimeframe}`);
  }

  async updateData() {
    if (this._isUpdating) {
      console.log('Update already in progress, skipping');
      return;
    }

    this._isUpdating = true;

    try {
      // Rotate to next timeframe at the start of the update cycle
      this.rotateTimeframe();

      console.log(
        `Updating data for timeframe: ${this.getCurrentTimeframe()}...`
      );

      // Fetch market data, current timeframe OHLC, and blockchain data with delays
      const results = [];

      // Fetch market data first
      try {
        console.log('Fetching market data...');
        const market = await this.fetchMarketData();
        results.push({ type: 'market', status: 'fulfilled', value: market });
      } catch (error) {
        console.error('Market data fetch failed:', error.message);
        results.push({ type: 'market', status: 'rejected', reason: error });
      }

      // Wait 2 seconds before next API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Fetch OHLC data
      try {
        console.log('Fetching OHLC data...');
        const ohlc = await this.fetchCurrentTimeframeOHLC();
        results.push({ type: 'ohlc', status: 'fulfilled', value: ohlc });
      } catch (error) {
        console.error('OHLC data fetch failed:', error.message);
        results.push({ type: 'ohlc', status: 'rejected', reason: error });
      }

      // Wait 2 seconds before next API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Fetch blockchain data (this makes 2 more API calls to CoinGecko)
      try {
        console.log('Fetching blockchain data...');
        const blockchainData = await this.fetchBlockchainData();
        results.push({
          type: 'blockchain',
          status: 'fulfilled',
          value: blockchainData,
        });
      } catch (error) {
        console.error('Blockchain data fetch failed:', error.message);
        results.push({ type: 'blockchain', status: 'rejected', reason: error });
      }

      // Process results
      let hasUpdates = false;
      const newCache = { ...this._cache };

      for (const result of results) {
        if (
          result.type === 'market' &&
          result.status === 'fulfilled' &&
          result.value?.currentPrice
        ) {
          Object.assign(newCache, result.value);
          hasUpdates = true;
          console.log('Market data updated');
        } else if (
          result.type === 'ohlc' &&
          result.status === 'fulfilled' &&
          result.value?.length > 0
        ) {
          if (!newCache.ohlcData) {
            newCache.ohlcData = {};
          }
          newCache.ohlcData[this.getCurrentTimeframe()] = result.value;
          hasUpdates = true;
          console.log(`OHLC data updated for ${this.getCurrentTimeframe()}`);
        } else if (
          result.type === 'blockchain' &&
          result.status === 'fulfilled' &&
          result.value?.blockHeight
        ) {
          Object.assign(newCache, result.value);
          hasUpdates = true;
          console.log('Blockchain data updated');
        }
      }

      // Add current timeframe to the data being sent
      newCache.currentTimeframe = this.getCurrentTimeframe();

      // Send update with all data
      if (hasUpdates) {
        this._cache = newCache;
        console.log(
          `Broadcasting timeframe ${this.getCurrentTimeframe()} with data to frontend`
        );
        websocketServer.updateData(this._cache);
        console.log('Data updated and broadcasted');
      } else {
        console.warn('No data updates available');
      }
    } catch (e) {
      console.error('Error updating data:', e.message);
    } finally {
      this._isUpdating = false;
    }
  }

  // Initial data fetch for first load - only fetch current timeframe
  async updateInitialData() {
    if (this._isUpdating) {
      console.log('Initial data fetch already in progress, skipping');
      return;
    }

    this._isUpdating = true;

    try {
      console.log(
        `Initial data fetch - loading timeframe: ${this.getCurrentTimeframe()}...`
      );

      // Stagger the API calls to prevent rate limiting
      let market, ohlc, blockchainData;

      try {
        market = await this.fetchMarketData();
        console.log('Initial market data fetched');
      } catch (error) {
        console.error('Initial market data fetch failed:', error.message);
      }

      // Wait 3 seconds before next call
      await new Promise((resolve) => setTimeout(resolve, 3000));

      try {
        ohlc = await this.fetchCurrentTimeframeOHLC();
        console.log('Initial OHLC data fetched');
      } catch (error) {
        console.error('Initial OHLC data fetch failed:', error.message);
      }

      // Wait 3 seconds before next call
      await new Promise((resolve) => setTimeout(resolve, 3000));

      try {
        blockchainData = await this.fetchBlockchainData();
        console.log('Initial blockchain data fetched');
      } catch (error) {
        console.error('Initial blockchain data fetch failed:', error.message);
      }

      let hasUpdates = false;
      const newCache = { ...this._cache };

      if (market?.currentPrice) {
        Object.assign(newCache, market);
        hasUpdates = true;
      }

      if (ohlc?.length > 0) {
        newCache.ohlcData = {};
        newCache.ohlcData[this.getCurrentTimeframe()] = ohlc;
        hasUpdates = true;
      }

      if (blockchainData?.blockHeight) {
        Object.assign(newCache, blockchainData);
        hasUpdates = true;
      }

      // Add current timeframe to the data being sent
      newCache.currentTimeframe = this.getCurrentTimeframe();

      if (hasUpdates) {
        this._cache = newCache;
        console.log(
          `Broadcasting initial timeframe ${this.getCurrentTimeframe()} with data to frontend`
        );
        websocketServer.updateData(this._cache);
        console.log('Initial data loaded and broadcasted');
      }
    } catch (e) {
      console.error('Error in initial data fetch:', e.message);
    } finally {
      this._isUpdating = false;
    }
  }

  async fetchMarketData() {
    const market = await coingecko.getMarketData();
    return market;
  }

  async fetchCurrentTimeframeOHLC() {
    const currentTimeframe = this.getCurrentTimeframe();
    return await coingecko.getOHLC(currentTimeframe);
  }

  async fetchBlockchainData() {
    const [blockHeight, globalMarketData, supplyData] = await Promise.all([
      blockchaininfo.getBlockHeight(),
      blockchaininfo.getMarketDominance(),
      blockchaininfo.getTotalSupply(),
    ]);
    return {
      blockHeight,
      // Keep backward compatibility
      marketDominance: globalMarketData.btcDominance,
      totalSupply: {
        current: supplyData.current,
        max: supplyData.max,
        percentage: supplyData.percentage,
      },
      // Add new metrics
      globalMarketData,
      extendedSupplyData: supplyData,
    };
  }
}

module.exports = new Scheduler();
