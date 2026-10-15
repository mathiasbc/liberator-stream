// Values derived from what the backend already sends. Pure functions so the
// header, network panel and ticker all agree on the same numbers.
import { toNumber } from './format';

export const HALVING_INTERVAL = 210000;
export const DIFFICULTY_EPOCH = 2016;
export const TARGET_BLOCK_SECONDS = 600;

// A 10-block average is noisy; only trust it inside a sane band
const blockSeconds = (avg) =>
  typeof avg === 'number' && avg > 300 && avg < 1200
    ? avg
    : TARGET_BLOCK_SECONDS;

export const halvingInfo = (height, now = Date.now()) => {
  if (typeof height !== 'number') return null;
  const done = height % HALVING_INTERVAL;
  const blocksLeft = HALVING_INTERVAL - done;
  const secondsLeft = blocksLeft * TARGET_BLOCK_SECONDS;
  return {
    nextHeight: height + blocksLeft,
    blocksLeft,
    progress: done / HALVING_INTERVAL,
    secondsLeft,
    eta: new Date(now + secondsLeft * 1000),
  };
};

export const difficultyInfo = (height, avgBlockSeconds) => {
  if (typeof height !== 'number') return null;
  const done = height % DIFFICULTY_EPOCH;
  const blocksLeft = DIFFICULTY_EPOCH - done;
  return {
    blocksLeft,
    progress: done / DIFFICULTY_EPOCH,
    secondsLeft: blocksLeft * blockSeconds(avgBlockSeconds),
  };
};

// New BTC per block: 50, halving every 210,000 blocks
export const blockSubsidy = (height) =>
  typeof height === 'number'
    ? 50 / 2 ** Math.floor(height / HALVING_INTERVAL)
    : null;

export const satsPerDollar = (price) =>
  typeof price === 'number' && price > 0 ? Math.round(1e8 / price) : null;

export const athInfo = (price, extended, now = Date.now()) => {
  const athPrice = toNumber(extended?.athPrice);
  if (!athPrice) return null;
  const fromAth =
    toNumber(extended?.priceChangePercentageFromAth) ??
    (price ? (price / athPrice - 1) * 100 : null);
  const athDate = extended?.athDate ? new Date(extended.athDate) : null;
  return {
    athPrice,
    fromAth,
    toAth: price ? (athPrice / price - 1) * 100 : null,
    athDate,
    daysSince:
      athDate && !isNaN(athDate)
        ? Math.floor((now - athDate.getTime()) / 86400000)
        : null,
  };
};

// Where the price sits inside today's low–high range, 0..1
export const rangePosition = (value, low, high) => {
  if (![value, low, high].every((v) => typeof v === 'number') || high <= low)
    return null;
  return Math.min(1, Math.max(0, (value - low) / (high - low)));
};
