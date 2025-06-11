import { useState, useEffect, useRef, useCallback } from 'react';
import { getMarketData, getOHLC } from '../services/coingecko';
import blockchainService from '../services/blockchain';

const UPDATE_INTERVAL_MS = 60000; // 60s - unified interval for all updates
const TIMEFRAMES = ['5M', '1H', '4H', '1D', '1W'];

export const useDataManager = () => {
  const [data, setData] = useState({
    currentPrice: null,
    priceChange: null,
    volume: null,
    marketCap: null,
    blockHeight: null,
    marketDominance: null,
    totalSupply: null,
    extendedSupplyData: null,
    ohlcData: {},
    currentTimeframe: '5M',
    lastUpdate: new Date(),
    secondsSinceUpdate: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentTimeframeIndexRef = useRef(0);
  const updateCycleRef = useRef(0);
  const isUpdatingRef = useRef(false);
  const intervalRef = useRef(null);
  const secondsIntervalRef = useRef(null);

  const getCurrentTimeframe = useCallback(() => {
    return TIMEFRAMES[currentTimeframeIndexRef.current];
  }, []);

  const rotateTimeframe = useCallback(() => {
    const oldTimeframe = getCurrentTimeframe();
    currentTimeframeIndexRef.current =
      (currentTimeframeIndexRef.current + 1) % TIMEFRAMES.length;
    const newTimeframe = getCurrentTimeframe();
    console.log(`Timeframe rotated: ${oldTimeframe} → ${newTimeframe}`);
    return newTimeframe;
  }, [getCurrentTimeframe]);

  const fetchMarketData = async () => {
    try {
      console.log('Fetching market data...');
      const market = await getMarketData();
      return { type: 'market', status: 'fulfilled', value: market };
    } catch (error) {
      console.error('Market data fetch failed:', error.message);
      return { type: 'market', status: 'rejected', reason: error };
    }
  };

  const fetchCurrentTimeframeOHLC = async (timeframe) => {
    try {
      console.log('Fetching OHLC data...');
      const ohlc = await getOHLC(timeframe);
      return { type: 'ohlc', status: 'fulfilled', value: ohlc };
    } catch (error) {
      console.error('OHLC data fetch failed:', error.message);
      return { type: 'ohlc', status: 'rejected', reason: error };
    }
  };

  const fetchBlockchainData = async () => {
    try {
      console.log('Fetching blockchain data...');

      // Fetch all blockchain data with delays
      const [blockHeight, marketDominance, totalSupply] =
        await Promise.allSettled([
          blockchainService.getBlockHeight(),
          new Promise((resolve) =>
            setTimeout(
              () => resolve(blockchainService.getMarketDominance()),
              5000
            )
          ),
          new Promise((resolve) =>
            setTimeout(() => resolve(blockchainService.getTotalSupply()), 10000)
          ),
        ]);

      const result = {};

      if (blockHeight.status === 'fulfilled') {
        result.blockHeight = blockHeight.value;
      }

      if (marketDominance.status === 'fulfilled') {
        result.marketDominance = marketDominance.value;
      }

      if (totalSupply.status === 'fulfilled') {
        result.totalSupply = {
          current: totalSupply.value.current,
          max: totalSupply.value.max,
          percentage: totalSupply.value.percentage,
        };
        result.extendedSupplyData = {
          circulatingSupply: totalSupply.value.circulatingSupply,
          athPrice: totalSupply.value.athPrice,
          athDate: totalSupply.value.athDate,
          atlPrice: totalSupply.value.atlPrice,
          atlDate: totalSupply.value.atlDate,
          priceChangePercentageFromAth:
            totalSupply.value.priceChangePercentageFromAth,
          marketCapRank: totalSupply.value.marketCapRank,
          liquidityScore: totalSupply.value.liquidityScore,
        };
      }

      return { type: 'blockchain', status: 'fulfilled', value: result };
    } catch (error) {
      console.error('Blockchain data fetch failed:', error.message);
      return { type: 'blockchain', status: 'rejected', reason: error };
    }
  };

  const updateData = useCallback(async () => {
    if (isUpdatingRef.current) {
      console.log('Update already in progress, skipping');
      return;
    }

    isUpdatingRef.current = true;
    setError(null);

    try {
      // Rotate to next timeframe at the start of the update cycle
      const newTimeframe = rotateTimeframe();
      updateCycleRef.current++;

      console.log(`Updating data for timeframe: ${newTimeframe}...`);

      // Fetch all data with delays
      const results = [];

      // Fetch market data first
      const marketResult = await fetchMarketData();
      results.push(marketResult);

      // Wait 5 seconds before next API call
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Fetch OHLC data
      const ohlcResult = await fetchCurrentTimeframeOHLC(newTimeframe);
      results.push(ohlcResult);

      // Wait 5 seconds before next API call
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Fetch blockchain data (this makes multiple API calls with internal delays)
      const blockchainResult = await fetchBlockchainData();
      results.push(blockchainResult);

      // Process results and update state
      setData((prevData) => {
        const newData = { ...prevData };
        let hasUpdates = false;

        for (const result of results) {
          if (
            result.type === 'market' &&
            result.status === 'fulfilled' &&
            result.value?.currentPrice
          ) {
            Object.assign(newData, result.value);
            hasUpdates = true;
            console.log('Market data updated');
          } else if (
            result.type === 'ohlc' &&
            result.status === 'fulfilled' &&
            result.value?.length > 0
          ) {
            if (!newData.ohlcData) {
              newData.ohlcData = {};
            }
            newData.ohlcData[newTimeframe] = result.value;
            hasUpdates = true;
            console.log(`OHLC data updated for ${newTimeframe}`);
          } else if (
            result.type === 'blockchain' &&
            result.status === 'fulfilled' &&
            result.value?.blockHeight
          ) {
            Object.assign(newData, result.value);
            hasUpdates = true;
            console.log('Blockchain data updated');
          }
        }

        // Add current timeframe to the data
        newData.currentTimeframe = newTimeframe;

        if (hasUpdates) {
          newData.lastUpdate = new Date();
          newData.secondsSinceUpdate = 0;
          console.log(`Data updated with timeframe ${newTimeframe}`);
        }

        return newData;
      });
    } catch (e) {
      console.error('Error updating data:', e.message);
      setError(e.message);
    } finally {
      isUpdatingRef.current = false;
      setIsLoading(false);
    }
  }, [rotateTimeframe]);

  // Initial data fetch
  const updateInitialData = useCallback(async () => {
    if (isUpdatingRef.current) {
      console.log('Initial data fetch already in progress, skipping');
      return;
    }

    isUpdatingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const currentTimeframe = getCurrentTimeframe();
      console.log(
        `Initial data fetch - loading timeframe: ${currentTimeframe}...`
      );

      // Stagger the API calls to prevent rate limiting
      let market, ohlc, blockchainData;

      try {
        market = await fetchMarketData();
        console.log('Initial market data fetched');
      } catch (error) {
        console.error('Initial market data fetch failed:', error.message);
      }

      // Wait 5 seconds before next call
      await new Promise((resolve) => setTimeout(resolve, 5000));

      try {
        ohlc = await fetchCurrentTimeframeOHLC(currentTimeframe);
        console.log('Initial OHLC data fetched');
      } catch (error) {
        console.error('Initial OHLC data fetch failed:', error.message);
      }

      // Wait 5 seconds before next call
      await new Promise((resolve) => setTimeout(resolve, 5000));

      try {
        blockchainData = await fetchBlockchainData();
        console.log('Initial blockchain data fetched');
      } catch (error) {
        console.error('Initial blockchain data fetch failed:', error.message);
      }

      // Update state with initial data
      setData((prevData) => {
        const newData = { ...prevData };
        let hasUpdates = false;

        if (market?.status === 'fulfilled' && market.value?.currentPrice) {
          Object.assign(newData, market.value);
          hasUpdates = true;
        }

        if (ohlc?.status === 'fulfilled' && ohlc.value?.length > 0) {
          newData.ohlcData = {};
          newData.ohlcData[currentTimeframe] = ohlc.value;
          hasUpdates = true;
        }

        if (
          blockchainData?.status === 'fulfilled' &&
          blockchainData.value?.blockHeight
        ) {
          Object.assign(newData, blockchainData.value);
          hasUpdates = true;
        }

        if (hasUpdates) {
          newData.currentTimeframe = currentTimeframe;
          newData.lastUpdate = new Date();
          newData.secondsSinceUpdate = 0;
          console.log('Initial data loaded successfully');
        }

        return newData;
      });
    } catch (e) {
      console.error('Error in initial data fetch:', e.message);
      setError(e.message);
    } finally {
      isUpdatingRef.current = false;
      setIsLoading(false);
    }
  }, [getCurrentTimeframe]);

  // Start the data manager
  const start = useCallback(() => {
    console.log('Starting data manager...');

    // Start update interval
    intervalRef.current = setInterval(() => {
      if (!isUpdatingRef.current) {
        updateCycleRef.current++;
        updateData();
      } else {
        console.log(
          'Skipping update cycle - previous update still in progress'
        );
      }
    }, UPDATE_INTERVAL_MS);

    // Start seconds counter
    secondsIntervalRef.current = setInterval(() => {
      setData((prevData) => ({
        ...prevData,
        secondsSinceUpdate:
          prevData.secondsSinceUpdate < 60
            ? prevData.secondsSinceUpdate + 1
            : prevData.secondsSinceUpdate,
      }));
    }, 1000);
  }, [updateData]);

  // Stop the data manager
  const stop = useCallback(() => {
    console.log('Stopping data manager...');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (secondsIntervalRef.current) {
      clearInterval(secondsIntervalRef.current);
      secondsIntervalRef.current = null;
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    updateInitialData().then(() => {
      start();
    });

    return () => {
      stop();
    };
  }, [updateInitialData, start, stop]);

  return {
    data,
    isLoading,
    error,
    refresh: updateData,
  };
};
