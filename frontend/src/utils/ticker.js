import { formatInt, formatPct, formatUsd, toNumber } from './format';
import { athInfo, blockSubsidy } from './metrics';

// Moments stay in the ticker this long
export const MOMENT_TTL_MS = 60 * 60 * 1000;

// Time on screen for one item: 6 s for a short one, up to 12 s
export const dwellMs = (text) =>
  Math.min(12000, Math.max(6000, 4000 + text.length * 50));

const utcTime = (at) => new Date(at).toISOString().slice(11, 16);

// Recent moments (round numbers crossed, new 24H highs and lows), newest
// first. The arrow segment carries the direction colour.
export const momentItems = (moments = [], now = Date.now()) =>
  moments
    .filter((m) => now - m.at < MOMENT_TTL_MS)
    .slice()
    .reverse()
    .map((m) => [
      [
        `${m.dir === 'up' ? '▲' : '▼'} ${m.kind === 'cross' ? 'CROSSED' : `NEW 24H ${m.kind.toUpperCase()}`}`,
        m.dir,
      ],
      [formatUsd(m.level), true],
      [`AT ${utcTime(m.at)} UTC`],
    ]);

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
