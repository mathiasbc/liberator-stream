// Cache schema for all frontend data fields
const CACHE_SCHEMA = {
  // Market data
  currentPrice: null,
  priceChange: null,
  volume: null,
  marketCap: null,

  // Blockchain data
  blockHeight: null,
  marketDominance: null,

  // Supply data
  totalSupply: {
    current: null,
    max: null,
    percentage: null,
  },

  // Extended supply data
  extendedSupplyData: {
    current: null,
    max: null,
    percentage: null,
    circulatingSupply: null,
    athPrice: null,
    athDate: null,
    atlPrice: null,
    atlDate: null,
    priceChangePercentageFromAth: null,
    marketCapRank: null,
    liquidityScore: null,
  },

  // Global market data
  globalMarketData: {
    btcDominance: null,
    totalMarketCap: null,
    totalVolume: null,
    activeCryptocurrencies: null,
    marketCapChangePercentage: null,
  },

  // OHLC data for all timeframes
  ohlcData: {
    '5M': [],
    '1H': [],
    '4H': [],
    '1D': [],
    '1W': [],
  },

  // Current active timeframe
  currentTimeframe: '5M',

  // Metadata
  lastUpdate: null,
  dataSource: null,
};

// Field mappings for different data types
const FIELD_MAPPINGS = {
  MARKET_DATA: ['currentPrice', 'priceChange', 'volume', 'marketCap'],
  BLOCKCHAIN_DATA: ['blockHeight'],
  SUPPLY_DATA: ['totalSupply', 'extendedSupplyData'],
  GLOBAL_DATA: ['marketDominance', 'globalMarketData'],
  OHLC_DATA: ['ohlcData'],
};

// Validation functions
const validateMarketData = (data) => {
  return (
    data &&
    typeof data.currentPrice === 'number' &&
    typeof data.priceChange === 'number' &&
    typeof data.volume === 'number' &&
    typeof data.marketCap === 'number'
  );
};

const validateOHLCData = (data) => {
  return (
    Array.isArray(data) &&
    data.every(
      (candle) =>
        candle &&
        typeof candle.time === 'number' &&
        typeof candle.open === 'number' &&
        typeof candle.high === 'number' &&
        typeof candle.low === 'number' &&
        typeof candle.close === 'number'
    )
  );
};

const validateBlockchainData = (data) => {
  return data && typeof data.blockHeight === 'number';
};

const validateSupplyData = (data) => {
  return (
    data &&
    typeof data.current === 'number' &&
    typeof data.max === 'number' &&
    typeof data.percentage === 'string'
  );
};

module.exports = {
  CACHE_SCHEMA,
  FIELD_MAPPINGS,
  validateMarketData,
  validateOHLCData,
  validateBlockchainData,
  validateSupplyData,
};
