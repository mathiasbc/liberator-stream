import { buildItems } from '../utils/ticker';

const text = (items) =>
  items.map((segments) => segments.map(([t]) => t).join(' '));

const data = (athDate) => ({
  currentPrice: 82388,
  extendedSupplyData: {
    athPrice: 126080,
    athDate,
    atlPrice: 67.81,
    atlDate: '2013-07-06T00:00:00.000Z',
  },
});

describe('ticker', () => {
  const now = Date.UTC(2026, 9, 15);

  test('counts the days since the last all-time high', () => {
    const items = text(buildItems(data('2025-10-06T10:57:42.000Z'), now));
    expect(items[0]).toBe('373 DAYS SINCE THE LAST ALL-TIME HIGH');
    expect(items.join(' ')).not.toMatch(/ALL-TIME LOW/);
  });

  test('says when the all-time high is today, and uses DAY for one', () => {
    expect(text(buildItems(data('2026-10-14T20:00:00.000Z'), now))[0]).toBe(
      'NEW ALL-TIME HIGH TODAY'
    );
    expect(text(buildItems(data('2026-10-13T20:00:00.000Z'), now))[0]).toBe(
      '1 DAY SINCE THE LAST ALL-TIME HIGH'
    );
  });

  test('skips the item without an ATH date', () => {
    const items = text(buildItems({ currentPrice: 82388 }, now));
    expect(items.join(' ')).not.toMatch(/ALL-TIME/);
  });
});
