/**
 * Centralized timeframe configuration.
 * Single source of truth for all timeframe-related constants.
 */

const TIMEFRAMES = ['5M', '1H', '4H', '1D', '1W'];

const TIMEFRAME_CONFIG = {
  '5M': {
    label: '5 Minutes',
    interval: 300,
    coingecko: { days: 1, maxCandles: 60 },
    binance: { interval: '5m', limit: 60 },
    coincap: { interval: 'm5', limit: 60 },
  },
  '1H': {
    label: '1 Hour',
    interval: 3600,
    coingecko: { days: 7, maxCandles: 60 },
    binance: { interval: '1h', limit: 60 },
    coincap: { interval: 'h1', limit: 60 },
  },
  '4H': {
    label: '4 Hours',
    interval: 14400,
    coingecko: { days: 14, maxCandles: 60 },
    binance: { interval: '4h', limit: 60 },
    coincap: { interval: 'h4', limit: 60 },
  },
  '1D': {
    label: '1 Day',
    interval: 86400,
    coingecko: { days: 90, maxCandles: 60 },
    binance: { interval: '1d', limit: 60 },
    coincap: { interval: 'd1', limit: 60 },
  },
  '1W': {
    label: '1 Week',
    interval: 604800,
    coingecko: { days: 365, maxCandles: 52 },
    binance: { interval: '1w', limit: 52 },
    coincap: { interval: 'w1', limit: 52 },
  },
};

const DEFAULT_TIMEFRAME = '5M';

const UPDATE_INTERVALS = {
  MARKET_DATA: 30_000,
  OHLC_DATA: 60_000,
  BLOCKCHAIN_DATA: 120_000,
  GLOBAL_DATA: 300_000,
};

function getTimeframeConfig(timeframe, provider = 'coingecko') {
  const tf = TIMEFRAME_CONFIG[timeframe];
  if (!tf) throw new Error(`Invalid timeframe: ${timeframe}`);

  const providerCfg = tf[provider];
  if (!providerCfg) {
    throw new Error(`Provider ${provider} not configured for ${timeframe}`);
  }

  return {
    ...providerCfg,
    timeframe,
    label: tf.label,
    intervalSeconds: tf.interval,
  };
}

function getTimeframeInterval(timeframe) {
  const cfg = TIMEFRAME_CONFIG[timeframe];
  if (!cfg) throw new Error(`Invalid timeframe: ${timeframe}`);
  return cfg.interval;
}

function getTimeframeBucket(timestamp, timeframe) {
  const interval = getTimeframeInterval(timeframe);
  return Math.floor(timestamp / interval) * interval;
}

function isValidTimeframe(timeframe) {
  return TIMEFRAMES.includes(timeframe);
}

function getNextTimeframe(currentTimeframe) {
  const currentIndex = TIMEFRAMES.indexOf(currentTimeframe);
  if (currentIndex === -1) return DEFAULT_TIMEFRAME;
  return TIMEFRAMES[(currentIndex + 1) % TIMEFRAMES.length];
}

module.exports = {
  TIMEFRAMES,
  TIMEFRAME_CONFIG,
  DEFAULT_TIMEFRAME,
  UPDATE_INTERVALS,
  getTimeframeConfig,
  getTimeframeInterval,
  getTimeframeBucket,
  isValidTimeframe,
  getNextTimeframe,
};
