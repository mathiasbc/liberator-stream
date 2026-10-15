import { formatInt, formatPct, toNumber } from './format';
import { athInfo, blockSubsidy } from './metrics';

const formatBlockTime = (seconds) =>
  `${Math.floor(seconds / 60)}M ${String(Math.round(seconds % 60)).padStart(2, '0')}S`;

// Each item is a list of [text, highlighted?] segments. The crawl only
// carries facts that aren't already on screen: the ATH price and distance,
// halving, difficulty, supply, fees, mempool and market cap all live in the
// panels above.
export const buildItems = (data, now = Date.now()) => {
  const items = [];
  const global = data.globalMarketData || {};
  const net = data.networkData || {};

  const ath = athInfo(data.currentPrice, data.extendedSupplyData, now);
  const days = ath?.daysSince;
  if (days === 0) {
    items.push([['NEW ALL-TIME HIGH'], ['TODAY', true]]);
  } else if (days > 0) {
    items.push([
      [`${formatInt(days)} ${days === 1 ? 'DAY' : 'DAYS'}`, true],
      ['SINCE THE LAST ALL-TIME HIGH'],
    ]);
  }
  const subsidy = blockSubsidy(data.blockHeight);
  if (subsidy) {
    items.push([
      ['BLOCK REWARD'],
      [`${subsidy} BTC`, true],
      ['· DROPS TO'],
      [`${subsidy / 2} BTC`, true],
      ['AT THE NEXT HALVING'],
    ]);
  }
  if (net.avgBlockSeconds) {
    items.push([
      ['THE LAST 10 BLOCKS CAME EVERY'],
      [formatBlockTime(net.avgBlockSeconds), true],
      ['ON AVERAGE · TARGET 10M 00S'],
    ]);
  }
  const chg = toNumber(global.marketCapChangePercentage);
  if (chg !== null) {
    items.push([
      ['WHOLE CRYPTO MARKET'],
      [formatPct(chg, 1, { sign: true }), true],
      ['IN 24H'],
      ...(global.activeCryptocurrencies
        ? [[`· ${formatInt(global.activeCryptocurrencies)} COINS TRACKED`]]
        : []),
    ]);
  }
  items.push([
    ['DATA'],
    ['BINANCE · COINGECKO · BLOCKSTREAM', true],
    ['· NOT FINANCIAL ADVICE'],
  ]);
  return items;
};
