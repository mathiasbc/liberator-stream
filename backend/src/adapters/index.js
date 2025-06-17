/**
 * API Adapters Index
 * Exports all available API adapters for easy import
 */

const BaseAdapter = require('./base-adapter');
const CoinGeckoAdapter = require('./coingecko-adapter');
const BlockstreamAdapter = require('./blockstream-adapter');
const CoinCapAdapter = require('./coincap-adapter');
const BinanceAdapter = require('./binance-adapter');

module.exports = {
  BaseAdapter,
  CoinGeckoAdapter,
  BlockstreamAdapter,
  CoinCapAdapter,
  BinanceAdapter,
};
