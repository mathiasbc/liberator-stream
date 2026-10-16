import {
  athInfo,
  blockSubsidy,
  difficultyInfo,
  feeUsd,
  halvingInfo,
  rangePosition,
  satsPerDollar,
} from '../utils/metrics';
import {
  formatAgo,
  formatCompactUsd,
  formatCountdown,
  formatEta,
  formatPct,
} from '../utils/format';

describe('metrics', () => {
  test('halving counts down to the next multiple of 210,000', () => {
    const now = Date.UTC(2026, 9, 15);
    const h = halvingInfo(971490, now);
    expect(h.nextHeight).toBe(1050000);
    expect(h.blocksLeft).toBe(78510);
    expect(h.progress).toBeCloseTo(131490 / 210000);
    expect(h.eta.getTime()).toBe(now + 78510 * 600 * 1000);
  });

  test('difficulty epoch uses the observed block time when sane', () => {
    const d = difficultyInfo(971490, 540);
    expect(d.blocksLeft).toBe(2016 - (971490 % 2016));
    expect(d.secondsLeft).toBe(d.blocksLeft * 540);
    // A wild 10-block average falls back to the 10 minute target
    expect(difficultyInfo(971490, 50).secondsLeft).toBe(d.blocksLeft * 600);
  });

  test('block reward halves every 210,000 blocks', () => {
    expect(blockSubsidy(0)).toBe(50);
    expect(blockSubsidy(840000)).toBe(3.125);
    expect(blockSubsidy(971490)).toBe(3.125);
    expect(blockSubsidy(1050000)).toBe(1.5625);
    expect(blockSubsidy(undefined)).toBeNull();
  });

  test('sats per dollar', () => {
    expect(satsPerDollar(100000)).toBe(1000);
    expect(satsPerDollar(null)).toBeNull();
  });

  test('fee in dollars for a typical transfer', () => {
    // 2 sat/vB × 140 vB = 280 sats; at $82,198 that is 23 cents
    expect(feeUsd(2, 82198)).toBeCloseTo(0.23, 2);
    expect(feeUsd(1, 100000, 200)).toBeCloseTo(0.2, 6);
    expect(feeUsd(undefined, 82198)).toBeNull();
    expect(feeUsd(2, null)).toBeNull();
  });

  test('ATH distance in both directions', () => {
    const ath = athInfo(
      81827,
      {
        athPrice: 126080,
        athDate: '2025-10-06T10:57:42.000Z',
        priceChangePercentageFromAth: '-35.40',
      },
      Date.UTC(2026, 9, 15)
    );
    expect(ath.fromAth).toBeCloseTo(-35.4);
    expect(ath.toAth).toBeCloseTo(54.08, 1);
    expect(ath.daysSince).toBe(373);
    expect(athInfo(81827, null)).toBeNull();
  });

  test('range position clamps to the day range', () => {
    expect(rangePosition(150, 100, 200)).toBe(0.5);
    expect(rangePosition(250, 100, 200)).toBe(1);
    expect(rangePosition(150, 200, 200)).toBeNull();
  });
});

describe('format', () => {
  test('percentages use a real minus sign', () => {
    expect(formatPct(-35.4)).toBe('−35.40%');
    expect(formatPct(2.5, 1, { sign: true })).toBe('+2.5%');
    expect(formatPct('n/a')).toBe('—');
  });

  test('compact dollars', () => {
    expect(formatCompactUsd(1644577402445)).toBe('$1.64T');
    expect(formatCompactUsd(1571231507)).toBe('$1.57B');
  });

  test('countdowns and ages', () => {
    expect(formatCountdown(42)).toBe('0:42');
    expect(formatCountdown(3 * 3600 + 5 * 60 + 9)).toBe('3:05:09');
    expect(formatCountdown(3 * 86400 + 20 * 3600 + 53 * 60 + 9)).toBe(
      '3d 20h 53m'
    );
    expect(formatAgo(45)).toBe('45s');
    expect(formatAgo(4 * 60 + 10)).toBe('4m');
    expect(formatEta(30 * 3600)).toBe('~30h');
    expect(formatEta(545 * 86400)).toBe('~545 days');
  });
});
