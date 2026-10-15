import {
  SIZES,
  fitPost,
  formatCount,
  postDuration,
  postWhen,
} from '../utils/posts';

describe('posts', () => {
  const now = Date.UTC(2026, 9, 16);

  test('old posts show their date, recent ones how long ago', () => {
    expect(postWhen({ createdAt: '2009-01-11T00:00:00.000Z' }, now)).toBe(
      'Jan 11, 2009'
    );
    expect(postWhen({ createdAt: '2026-10-15T21:00:00.000Z' }, now)).toBe(
      '3h 0m'
    );
    expect(postWhen({ minutesAgo: 12 }, now)).toBe('12m');
  });

  test('longer posts stay on screen longer, within 8 to 20 seconds', () => {
    expect(postDuration('Running bitcoin')).toBe(8000);
    expect(postDuration('x'.repeat(120))).toBe(12400);
    expect(postDuration('x'.repeat(280))).toBe(19600);
    expect(postDuration('x'.repeat(400))).toBe(20000);
  });

  test('counts are whole numbers until they need compacting', () => {
    expect(formatCount(9)).toBe('9');
    expect(formatCount(412)).toBe('412');
    expect(formatCount(133110)).toBe('133.1K');
  });

  test('short posts get the largest size', () => {
    const fitted = fitPost('Running bitcoin');
    expect(fitted.text).toBe('Running bitcoin');
    expect(SIZES[fitted.index].fontSize).toBe('38px');
  });

  test('line breaks are kept when they fit and flattened when they do not', () => {
    const list =
      'The twin pillars:\n\n1. Move your wealth without permission\n\n2. It cannot be debased\n\nEverything else is noise.';
    expect(fitPost(list).text).toBe(
      'The twin pillars:\n1. Move your wealth without permission\n2. It cannot be debased\nEverything else is noise.'
    );
    const stacked =
      'Humans can do incredible things.\n\nThe Pyramids.\n\nFlight.\n\nGoing to the moon.\n\nNuclear power.\n\nBut creating a money system that no one can corrupt might be our most impressive and improbable achievement.';
    const fitted = fitPost(stacked);
    expect(fitted.text).not.toMatch(/\n/);
    expect(SIZES[fitted.index].fontSize).toBe('21px');
  });
});
