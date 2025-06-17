/**
 * Centralized timeframe configuration
 * All timeframe-related constants and configurations should be defined here
 */

// Available timeframes in display order
const TIMEFRAMES = ['5M', '1H', '4H', '1D', '1W'];

// Timeframe configuration for different APIs and data processing
const TIMEFRAME_CONFIG = {
  '5M': {
    label: '5 Minutes',
    interval: 300, // seconds
    coingecko: {
      endpoint: 'market_chart',
      days: 0.5, // 12 hours of minutely data to create 5-min candles
      interval: null,
      description: '5-minute candles (last 4 hours)',
      maxCandles: 50,
    },
    binance: {
      interval: '5m',
      limit: 50,
      description: '5-minute candles',
    },
    coincap: {
      interval: 'm5',
      limit: 50,
      description: '5-minute candles',
    },
  },
  '1H': {
    label: '1 Hour',
    interval: 3600, // seconds
    coingecko: {
      endpoint: 'market_chart',
      days: 3, // 3 days of 5-minute data to create 1-hour candles
      interval: null,
      description: '1-hour candles (last 50 hours)',
      maxCandles: 50,
    },
    binance: {
      interval: '1h',
      limit: 50,
      description: '1-hour candles',
    },
    coincap: {
      interval: 'h1',
      limit: 50,
      description: '1-hour candles',
    },
  },
  '4H': {
    label: '4 Hours',
    interval: 14400, // seconds
    coingecko: {
      endpoint: 'market_chart',
      days: 10, // 10 days of hourly data to create 4-hour candles
      interval: null,
      description: '4-hour candles (last 200 hours)',
      maxCandles: 50,
    },
    binance: {
      interval: '4h',
      limit: 50,
      description: '4-hour candles',
    },
    coincap: {
      interval: 'h4',
      limit: 50,
      description: '4-hour candles',
    },
  },
  '1D': {
    label: '1 Day',
    interval: 86400, // seconds
    coingecko: {
      endpoint: 'market_chart',
      days: 60, // 60 days = daily data with some extra for processing
      interval: null,
      description: '1-day candles (last 50 days)',
      maxCandles: 50,
    },
    binance: {
      interval: '1d',
      limit: 50,
      description: '1-day candles',
    },
    coincap: {
      interval: 'd1',
      limit: 50,
      description: '1-day candles',
    },
  },
  '1W': {
    label: '1 Week',
    interval: 604800, // seconds
    coingecko: {
      endpoint: 'market_chart',
      days: 365, // 365 days = ~52 weeks of data
      interval: null,
      description: '1-week view (last 50 weeks)',
      maxCandles: 50,
    },
    binance: {
      interval: '1w',
      limit: 50,
      description: '1-week candles',
    },
    coincap: {
      interval: 'w1',
      limit: 50,
      description: '1-week candles',
    },
  },
};

// Default timeframe for initial load
const DEFAULT_TIMEFRAME = '5M';

// Update intervals for different data types (in milliseconds)
const UPDATE_INTERVALS = {
  UNIFIED: 60000, // 60s - unified interval for all updates
  MARKET_DATA: 30000, // 30s for market data (more frequent)
  OHLC_DATA: 60000, // 60s for OHLC data
  BLOCKCHAIN_DATA: 120000, // 2 minutes for blockchain data (less frequent)
  GLOBAL_DATA: 300000, // 5 minutes for global market data (least frequent)
};

// Rotation settings
const ROTATION_CONFIG = {
  ENABLED: true,
  INTERVAL: UPDATE_INTERVALS.UNIFIED, // Rotate every 60 seconds
  RANDOMIZE: false, // Set to true for random rotation instead of sequential
};

/**
 * Get timeframe configuration for a specific API provider
 * @param {string} timeframe - The timeframe (5M, 1H, etc.)
 * @param {string} provider - The API provider (coingecko, binance, etc.)
 * @returns {Object} Configuration object for the timeframe and provider
 */
function getTimeframeConfig(timeframe, provider = 'coingecko') {
  const timeframeData = TIMEFRAME_CONFIG[timeframe];
  if (!timeframeData) {
    throw new Error(`Invalid timeframe: ${timeframe}`);
  }

  const providerConfig = timeframeData[provider];
  if (!providerConfig) {
    throw new Error(
      `Provider ${provider} not configured for timeframe ${timeframe}`
    );
  }

  return {
    ...providerConfig,
    timeframe,
    label: timeframeData.label,
    intervalSeconds: timeframeData.interval, // Keep generic interval in seconds
  };
}

/**
 * Get the interval in seconds for a timeframe
 * @param {string} timeframe - The timeframe
 * @returns {number} Interval in seconds
 */
function getTimeframeInterval(timeframe) {
  const config = TIMEFRAME_CONFIG[timeframe];
  if (!config) {
    throw new Error(`Invalid timeframe: ${timeframe}`);
  }
  return config.interval;
}

/**
 * Convert timestamp to timeframe bucket
 * @param {number} timestamp - Unix timestamp in seconds
 * @param {string} timeframe - The timeframe
 * @returns {number} Bucketed timestamp
 */
function getTimeframeBucket(timestamp, timeframe) {
  const interval = getTimeframeInterval(timeframe);
  return Math.floor(timestamp / interval) * interval;
}

/**
 * Validate if a timeframe is supported
 * @param {string} timeframe - The timeframe to validate
 * @returns {boolean} Whether the timeframe is valid
 */
function isValidTimeframe(timeframe) {
  return TIMEFRAMES.includes(timeframe);
}

/**
 * Get the next timeframe in rotation
 * @param {string} currentTimeframe - Current timeframe
 * @returns {string} Next timeframe
 */
function getNextTimeframe(currentTimeframe) {
  const currentIndex = TIMEFRAMES.indexOf(currentTimeframe);
  if (currentIndex === -1) {
    return DEFAULT_TIMEFRAME;
  }

  if (ROTATION_CONFIG.RANDOMIZE) {
    // Random rotation (excluding current)
    const otherTimeframes = TIMEFRAMES.filter((tf) => tf !== currentTimeframe);
    return otherTimeframes[Math.floor(Math.random() * otherTimeframes.length)];
  } else {
    // Sequential rotation
    return TIMEFRAMES[(currentIndex + 1) % TIMEFRAMES.length];
  }
}

module.exports = {
  TIMEFRAMES,
  TIMEFRAME_CONFIG,
  DEFAULT_TIMEFRAME,
  UPDATE_INTERVALS,
  ROTATION_CONFIG,
  getTimeframeConfig,
  getTimeframeInterval,
  getTimeframeBucket,
  isValidTimeframe,
  getNextTimeframe,
};
