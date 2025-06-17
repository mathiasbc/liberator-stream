// Unit tests for API components
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Import components to test
const CoinGeckoAdapter = require('../../adapters/coingecko-adapter');
const BinanceAdapter = require('../../adapters/binance-adapter');
const CacheService = require('../../cache/cache-service');

describe('API Component Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get = jest.fn();
    mockedAxios.post = jest.fn();
  });

  afterEach(() => {
    // Clear any timers or async operations
    jest.clearAllTimers();
  });

  afterAll(() => {
    // Ensure all async operations are complete
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('CoinGecko Adapter', () => {
    let adapter;

    beforeEach(() => {
      adapter = new CoinGeckoAdapter();
    });

    test('should fetch market data successfully', async () => {
      const mockResponse = {
        data: {
          bitcoin: {
            usd: 45000,
            usd_24h_change: 2.5,
            usd_24h_vol: 25000000000,
            usd_market_cap: 850000000000,
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await adapter.getMarketData();

      expect(result.currentPrice).toBe(45000);
      expect(result.priceChange).toBe(2.5);
      expect(result.volume).toBe(25000000000);
      expect(result.marketCap).toBe(850000000000);
    });

    test('should fetch OHLC data successfully', async () => {
      const mockResponse = {
        data: {
          prices: [
            [1640995200000, 47000],
            [1640995500000, 47100],
            [1640995800000, 47050],
          ],
          total_volumes: [
            [1640995200000, 1000000],
            [1640995500000, 1100000],
            [1640995800000, 1050000],
          ],
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await adapter.getOHLCData('5M');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('time');
      expect(result[0]).toHaveProperty('open');
      expect(result[0]).toHaveProperty('high');
      expect(result[0]).toHaveProperty('low');
      expect(result[0]).toHaveProperty('close');
      expect(result[0]).toHaveProperty('volume');
    });

    test('should get supported data types', () => {
      const types = adapter.getSupportedDataTypes();
      expect(types).toContain('market');
      expect(types).toContain('ohlc');
      expect(types).toContain('supply');
      expect(types).toContain('global');
    });
  });

  describe('Binance Adapter', () => {
    let adapter;

    beforeEach(() => {
      adapter = new BinanceAdapter();
    });

    test('should fetch market data successfully', async () => {
      const tickerResponse = {
        data: {
          symbol: 'BTCUSDT',
          priceChangePercent: '2.3',
          volume: '13837.39654',
        }
      };

      const priceResponse = {
        data: {
          symbol: 'BTCUSDT',
          price: '45000'
        }
      };

      mockedAxios.get
        .mockResolvedValueOnce(tickerResponse)
        .mockResolvedValueOnce(priceResponse);

      const result = await adapter.getMarketData();

      expect(result.currentPrice).toBe(45000);
      expect(result.priceChange).toBe(2.3);
      expect(result.volume).toBe(13837.39654);
      expect(result.marketCap).toBe(0); // Binance doesn't provide market cap
    });

    test('should fetch OHLC data successfully', async () => {
      const mockResponse = {
        data: [
          [1640995200000, '47000', '47200', '46800', '47100', '1000000', 1640995259999],
          [1640995260000, '47100', '47300', '46900', '47200', '1100000', 1640995319999],
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await adapter.getOHLCData('5M');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('time');
      expect(result[0]).toHaveProperty('open');
      expect(result[0]).toHaveProperty('high');
      expect(result[0]).toHaveProperty('low');
      expect(result[0]).toHaveProperty('close');
      expect(result[0]).toHaveProperty('volume');
    });

    test('should get supported data types', () => {
      const types = adapter.getSupportedDataTypes();
      expect(types).toContain('market');
      expect(types).toContain('ohlc');
      expect(types).not.toContain('supply');
      expect(types).not.toContain('global');
    });
  });

  describe('Cache Service', () => {
    let cacheService;

    beforeEach(() => {
      cacheService = new CacheService();
    });

    afterEach(() => {
      // Clean up any cache service timers or intervals
      if (cacheService && cacheService.cleanup) {
        cacheService.cleanup();
      }
    });

    test('should update and validate market data', () => {
      const marketData = {
        currentPrice: 45000,
        priceChange: 2.5,
        volume: 25000000000,
        marketCap: 850000000000,
      };

      const updated = cacheService.updateMarketData(marketData, 'coingecko');
      expect(updated).toBe(true);

      const cached = cacheService.get('currentPrice');
      expect(cached).toBe(45000);
    });

    test('should update OHLC data for specific timeframes', () => {
      const ohlcData = [
        {
          time: 1640995200,
          open: 47000,
          high: 47200,
          low: 46800,
          close: 47100,
          volume: 1000000,
        },
      ];

      const updated = cacheService.updateOHLCData('5M', ohlcData, 'coingecko');
      expect(updated).toBe(true);

      const cached = cacheService.get('ohlcData');
      expect(cached['5M']).toEqual(ohlcData);
    });

    test('should handle timeframe rotation', () => {
      const timeframes = ['5M', '1H', '4H', '1D', '1W'];

      timeframes.forEach((tf, index) => {
        const mockData = [
          {
            time: 1640995200 + index * 300,
            open: 47000 + index,
            high: 47200 + index,
            low: 46800 + index,
            close: 47100 + index,
            volume: 1000000,
          },
        ];

        cacheService.updateOHLCData(tf, mockData, 'test');
        cacheService.updateCurrentTimeframe(tf);
      });

      const allData = cacheService.get('ohlcData');
      timeframes.forEach((tf) => {
        expect(allData[tf]).toBeDefined();
        expect(allData[tf].length).toBe(1);
      });

      expect(cacheService.get('currentTimeframe')).toBe('1W');
    });

    test('should track memory usage and perform cleanup', () => {
      // Simulate many updates to trigger memory management
      for (let i = 0; i < 150; i++) {
        cacheService.updateMarketData(
          {
            currentPrice: 45000 + i,
            priceChange: 2.5,
            volume: 25000000000,
            marketCap: 850000000000,
          },
          'test'
        );
      }

      const finalStats = cacheService.getStats();
      expect(finalStats.memoryInfo.updateCounter).toBeGreaterThan(0);
      expect(finalStats.memoryInfo.historySize).toBeLessThanOrEqual(100);
    });

    test('should manage memory efficiently over time', () => {
      // Simulate long-running behavior
      for (let i = 0; i < 1000; i++) {
        cacheService.updateMarketData(
          {
            currentPrice: 45000 + Math.random() * 1000,
            priceChange: Math.random() * 10 - 5,
            volume: 25000000000,
            marketCap: 850000000000,
          },
          'test'
        );
      }

      // Force memory cleanup
      cacheService.forceMemoryCleanup();

      const finalStats = cacheService.getStats();
      expect(finalStats.memoryInfo.historySize).toBeLessThanOrEqual(100);
      expect(finalStats.memoryInfo.updateCounter).toBeLessThan(Number.MAX_SAFE_INTEGER);
    });

    test('should handle counter overflow protection', () => {
      // Simulate near-overflow condition
      cacheService.updateCounter = Number.MAX_SAFE_INTEGER - 100;

      for (let i = 0; i < 200; i++) {
        cacheService.updateMarketData(
          {
            currentPrice: 45000,
            priceChange: 2.5,
            volume: 25000000000,
            marketCap: 850000000000,
          },
          'test'
        );
      }

      // Should have wrapped around safely
      expect(cacheService.updateCounter).toBeLessThan(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('Data Validation', () => {
    test('should validate OHLC data format', () => {
      const validOHLCData = [
        {
          time: 1640995200,
          open: 47000,
          high: 47200,
          low: 46800,
          close: 47100,
          volume: 1000000,
        },
      ];

      validOHLCData.forEach((candle) => {
        expect(typeof candle.time).toBe('number');
        expect(typeof candle.open).toBe('number');
        expect(typeof candle.high).toBe('number');
        expect(typeof candle.low).toBe('number');
        expect(typeof candle.close).toBe('number');
        expect(typeof candle.volume).toBe('number');

        // Validate OHLC relationships
        expect(candle.high).toBeGreaterThanOrEqual(candle.open);
        expect(candle.high).toBeGreaterThanOrEqual(candle.close);
        expect(candle.low).toBeLessThanOrEqual(candle.open);
        expect(candle.low).toBeLessThanOrEqual(candle.close);
      });
    });
  });
});