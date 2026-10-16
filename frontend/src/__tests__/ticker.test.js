import { buildItems, dwellMs, momentItems } from '../utils/ticker';

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

  test('each item stays up longer the more there is to read', () => {
    expect(dwellMs('CROSSED $83,000')).toBe(6000);
    expect(dwellMs('x'.repeat(80))).toBe(8000);
    expect(dwellMs('x'.repeat(300))).toBe(12000);
  });

  test('moments become items, newest first, and expire after an hour', () => {
    const at = Date.UTC(2026, 9, 16, 23, 41);
    const moments = [
      {
        id: 'a',
        kind: 'cross',
        dir: 'up',
        level: 83000,
        at: at - 2 * 3600 * 1000,
      },
      { id: 'b', kind: 'cross', dir: 'down', level: 83000, at },
      { id: 'c', kind: 'high', dir: 'up', level: 83210, at: at + 60000 },
    ];
    const items = momentItems(moments, at + 120000);
    expect(text(items)).toEqual([
      '▲ NEW 24H HIGH $83,210 AT 23:42 UTC',
      '▼ CROSSED $83,000 AT 23:41 UTC',
    ]);
    expect(items[0][0][1]).toBe('up');
    expect(items[1][0][1]).toBe('down');
    expect(items[0][1]).toEqual(['$83,210', true]);
  });
});
