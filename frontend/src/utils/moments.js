// Things worth a few seconds of attention on a 24/7 stream: the price
// crossing a round number, or setting a new 24-hour high or low. Pure, so
// the price block and the ticker agree on what happened.
import { formatUsd } from './format';

export const ROUND_STEP = 1000;
// A price flapping around the same line shouldn't announce it again
export const CROSS_COOLDOWN_MS = 10 * 60 * 1000;
// A climbing price sets a new high every tick; announce one per 5 minutes
export const EXTREME_COOLDOWN_MS = 5 * 60 * 1000;
// How long a tag stays on screen
export const TAG_MS = 5000;
// The 24H window's edge can move for other reasons (an old high dropping
// out, a source switch); only count it when the price is right there
const AT_EDGE = 0.0005;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Compares two market snapshots ({ price, high, low }). Returns the moments
 * in between and the memory to pass in next time. Each moment has a `kind`
 * (cross, high, low), a `dir`, the `level` it concerns, and `announce`:
 * false when it's a repeat inside the cooldown (show the tag, skip the
 * ticker).
 */
export const detectMoments = (prev, next, now, memory = {}) => {
  const moments = [];
  const mem = { ...memory };

  if (
    isNum(prev.price) &&
    isNum(next.price) &&
    Math.floor(prev.price / ROUND_STEP) !== Math.floor(next.price / ROUND_STEP)
  ) {
    const up = next.price > prev.price;
    const level =
      Math.floor((up ? next.price : prev.price) / ROUND_STEP) * ROUND_STEP;
    const repeat =
      mem.lastCross &&
      mem.lastCross.level === level &&
      now - mem.lastCross.at < CROSS_COOLDOWN_MS;
    if (!repeat) {
      mem.lastCross = { level, at: now };
      moments.push({ kind: 'cross', dir: up ? 'up' : 'down', level, at: now });
    }
  }

  const edges = [
    [
      'high',
      'up',
      isNum(next.high) &&
        isNum(prev.high) &&
        next.high > prev.high &&
        next.price >= next.high * (1 - AT_EDGE),
    ],
    [
      'low',
      'down',
      isNum(next.low) &&
        isNum(prev.low) &&
        next.low < prev.low &&
        next.price <= next.low * (1 + AT_EDGE),
    ],
  ];
  for (const [kind, dir, happened] of edges) {
    if (!happened || !isNum(next.price)) continue;
    const key = `last${kind}At`;
    const announce =
      mem[key] === undefined || now - mem[key] >= EXTREME_COOLDOWN_MS;
    if (announce) mem[key] = now;
    moments.push({ kind, dir, level: next[kind], at: now, announce });
  }

  return {
    moments: moments.map((m) => ({ announce: true, ...m })),
    memory: mem,
  };
};

export const momentText = (moment) => {
  const level = formatUsd(moment.level);
  if (moment.kind === 'cross') return `CROSSED ${level}`;
  return `NEW 24H ${moment.kind.toUpperCase()} ${level}`;
};
