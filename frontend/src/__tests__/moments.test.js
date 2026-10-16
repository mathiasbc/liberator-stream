import {
  CROSS_COOLDOWN_MS,
  EXTREME_COOLDOWN_MS,
  detectMoments,
  momentText,
} from '../utils/moments';

const snap = (price, high = 85000, low = 80000) => ({ price, high, low });

describe('moments', () => {
  test('crossing a round number, in either direction', () => {
    const up = detectMoments(snap(82990), snap(83010), 1000);
    expect(up.moments).toEqual([
      { kind: 'cross', dir: 'up', level: 83000, at: 1000, announce: true },
    ]);
    expect(momentText(up.moments[0])).toBe('CROSSED $83,000');

    const down = detectMoments(snap(83010), snap(82990), 2000);
    expect(down.moments[0]).toMatchObject({ dir: 'down', level: 83000 });
  });

  test('a price flapping around the same line stays quiet for a while', () => {
    let { memory } = detectMoments(snap(82990), snap(83010), 0);
    expect(
      detectMoments(snap(83010), snap(82990), 60000, memory).moments
    ).toEqual([]);
    expect(
      detectMoments(snap(82990), snap(83010), CROSS_COOLDOWN_MS + 1, memory)
        .moments
    ).toHaveLength(1);
  });

  test('a new 24H high only counts when the price is at it', () => {
    const real = detectMoments(snap(82600, 82600), snap(82650, 82650), 0);
    expect(real.moments).toEqual([
      { kind: 'high', dir: 'up', level: 82650, at: 0, announce: true },
    ]);
    expect(momentText(real.moments[0])).toBe('NEW 24H HIGH $82,650');

    // The window moved or the source changed; the price isn't there
    const moved = detectMoments(snap(82000, 82600), snap(82000, 82700), 0);
    expect(moved.moments).toEqual([]);
  });

  test('repeated highs keep the tag but announce once per cooldown', () => {
    const first = detectMoments(snap(82600, 82600), snap(82650, 82650), 0);
    const again = detectMoments(
      snap(82650, 82650),
      snap(82700, 82700),
      1000,
      first.memory
    );
    expect(again.moments[0]).toMatchObject({ kind: 'high', announce: false });
    const later = detectMoments(
      snap(82700, 82700),
      snap(82800, 82800),
      EXTREME_COOLDOWN_MS + 1,
      again.memory
    );
    expect(later.moments[0]).toMatchObject({ kind: 'high', announce: true });
  });

  test('a new 24H low', () => {
    const { moments } = detectMoments(
      snap(80200, 85000, 80200),
      snap(80150, 85000, 80150),
      0
    );
    expect(moments).toHaveLength(1);
    expect(moments[0]).toMatchObject({
      kind: 'low',
      dir: 'down',
      level: 80150,
    });
    expect(momentText(moments[0])).toBe('NEW 24H LOW $80,150');
  });

  test('nothing on the first snapshot or with missing numbers', () => {
    expect(detectMoments({}, snap(83010), 0).moments).toEqual([]);
    expect(detectMoments(snap(null), snap(83010), 0).moments).toEqual([]);
  });
});
