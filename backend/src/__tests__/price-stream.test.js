const { EventEmitter } = require('events');
const {
  BinanceTickerStream,
  normalizeTicker,
  STALE_MS,
  MAX_ATTEMPTS,
} = require('../services/binance-ticker-stream');

const tickerEvent = {
  e: '24hrTicker',
  s: 'BTCUSDT',
  P: '-3.202',
  c: '80614.97',
  o: '83282.01',
  h: '84146.72',
  l: '80226.35',
  q: '1730647695.14',
};
const frame = (obj) => Buffer.from(JSON.stringify(obj));

class FakeSocket extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    FakeSocket.instances.push(this);
  }
  terminate() {
    this.terminated = true;
  }
}
FakeSocket.instances = [];
const last = () => FakeSocket.instances[FakeSocket.instances.length - 1];

describe('normalizeTicker', () => {
  test('maps a 24h ticker to market data', () => {
    expect(normalizeTicker(tickerEvent)).toEqual({
      currentPrice: 80614.97,
      priceChange: -3.202,
      volume: 1730647695.14,
      dayOpen: 83282.01,
      dayHigh: 84146.72,
      dayLow: 80226.35,
      dayClose: 80614.97,
    });
  });

  test('accepts combined-stream envelopes and rejects junk', () => {
    expect(
      normalizeTicker({ stream: 'x', data: tickerEvent }).currentPrice
    ).toBe(80614.97);
    expect(normalizeTicker({ e: 'trade', p: '1' })).toBeNull();
    expect(normalizeTicker({ ...tickerEvent, c: 'NaN' })).toBeNull();
    expect(normalizeTicker(null)).toBeNull();
  });
});

describe('BinanceTickerStream', () => {
  let now;
  let stream;
  const make = (endpoints = ['wss://a', 'wss://b']) =>
    new BinanceTickerStream({
      endpoints,
      WebSocketImpl: FakeSocket,
      now: () => now,
    });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    FakeSocket.instances = [];
    now = 1_000_000;
  });

  afterEach(() => {
    stream?.stop();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('emits ticks and is healthy until the data goes stale', () => {
    stream = make();
    const onTicker = jest.fn();
    const onUp = jest.fn();
    stream.on('ticker', onTicker);
    stream.on('up', onUp);
    stream.start();

    last().emit('open');
    last().emit('message', frame(tickerEvent));

    expect(onUp).toHaveBeenCalledTimes(1);
    expect(onTicker).toHaveBeenCalledWith(
      expect.objectContaining({ currentPrice: 80614.97 })
    );
    expect(stream.isHealthy()).toBe(true);

    now += STALE_MS + 1;
    expect(stream.isHealthy()).toBe(false);
  });

  test('reconnects with backoff and rotates away from a dead endpoint', () => {
    stream = make();
    const onDown = jest.fn();
    stream.on('down', onDown);
    stream.start();

    // Live connection drops: same endpoint again after ~1s
    last().emit('open');
    last().emit('message', frame(tickerEvent));
    last().emit('close', 1006);
    expect(onDown).toHaveBeenCalledTimes(1);
    expect(stream.isHealthy()).toBe(false);

    jest.advanceTimersByTime(1300);
    expect(FakeSocket.instances).toHaveLength(2);
    expect(last().url).toBe('wss://a');

    // That one never delivers: try the other endpoint, after a longer wait
    last().emit('close', 1006);
    jest.advanceTimersByTime(1500);
    expect(FakeSocket.instances).toHaveLength(2);
    jest.advanceTimersByTime(1000);
    expect(FakeSocket.instances).toHaveLength(3);
    expect(last().url).toBe('wss://b');
  });

  test('never exceeds the connection attempt budget', () => {
    stream = make();
    stream.start();
    for (let i = 0; i < MAX_ATTEMPTS + 10; i++) {
      last().emit('close', 1006);
      jest.advanceTimersByTime(61_000);
    }
    // `now` is frozen, so every attempt falls inside one 5-minute window
    expect(FakeSocket.instances).toHaveLength(MAX_ATTEMPTS);
  });

  test('watchdog kills a socket that goes quiet', () => {
    stream = make();
    const onDown = jest.fn();
    stream.on('down', onDown);
    stream.start();
    const ws = last();
    ws.emit('open');
    ws.emit('message', frame(tickerEvent));

    now += STALE_MS + 1;
    jest.advanceTimersByTime(5000);

    expect(ws.terminated).toBe(true);
    expect(onDown).toHaveBeenCalledWith(expect.stringMatching(/no data/));
    jest.advanceTimersByTime(1300);
    expect(FakeSocket.instances).toHaveLength(2);
  });

  test('stop() leaves no timers or sockets behind', () => {
    stream = make();
    stream.start();
    const ws = last();
    stream.stop();
    expect(ws.terminated).toBe(true);
    jest.advanceTimersByTime(120_000);
    expect(FakeSocket.instances).toHaveLength(1);
  });
});

describe('Scheduler with the price stream', () => {
  const websocketServer = require('../websocket/server');
  const Scheduler = require('../services/scheduler');
  let scheduler;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    scheduler = new Scheduler();
  });

  afterEach(() => {
    scheduler.stop();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('skips REST price polling while the stream is healthy', async () => {
    const getMarketData = jest.fn().mockResolvedValue({
      source: 'binance',
      data: { currentPrice: 80000, priceChange: -1, volume: 1e9 },
    });
    scheduler.apiManager.getMarketData = getMarketData;

    scheduler.priceStream.isHealthy = () => true;
    await scheduler.updateMarketData();
    expect(getMarketData).not.toHaveBeenCalled();

    scheduler.priceStream.isHealthy = () => false;
    await scheduler.updateMarketData();
    expect(getMarketData).toHaveBeenCalledTimes(1);
    expect(scheduler.cacheService.get('currentPrice')).toBe(80000);
  });

  test('pushes at most one small price tick per second', () => {
    jest.useFakeTimers();
    const send = jest
      .spyOn(websocketServer, 'broadcastPartial')
      .mockImplementation(() => {});

    scheduler.cacheService.updateMarketData(
      normalizeTicker(tickerEvent),
      'binance-ws',
      { quiet: true }
    );
    for (let i = 0; i < 5; i++) scheduler.queuePriceTick();
    jest.advanceTimersByTime(10);
    expect(send).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 5; i++) scheduler.queuePriceTick();
    jest.advanceTimersByTime(500);
    expect(send).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(600);
    expect(send).toHaveBeenCalledTimes(2);

    const payload = send.mock.calls[0][0];
    expect(payload.currentPrice).toBe(80614.97);
    expect(payload).not.toHaveProperty('ohlcData');
  });
});
