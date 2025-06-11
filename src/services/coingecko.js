const BASE_URL = '/api/v3';
const BITCOIN_ID = 'bitcoin';

const TIMEFRAME_CONFIG = {
  '5M': {
    endpoint: 'market_chart',
    days: 0.5,
    interval: null,
    description: '5-minute candles (last 4 hours)',
    maxCandles: 50,
  },
  '1H': {
    endpoint: 'market_chart',
    days: 3,
    interval: null,
    description: '1-hour candles (last 50 hours)',
    maxCandles: 50,
  },
  '4H': {
    endpoint: 'market_chart',
    days: 10,
    interval: null,
    description: '4-hour candles (last 200 hours)',
    maxCandles: 50,
  },
  '1D': {
    endpoint: 'market_chart',
    days: 60,
    interval: null,
    description: '1-day candles (last 50 days)',
    maxCandles: 50,
  },
  '1W': {
    endpoint: 'market_chart',
    days: 365,
    interval: null,
    description: '1-week view (last 50 weeks)',
    maxCandles: 50,
  },
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to clean and sort data for chart compatibility
function cleanAndSortData(data, maxCandles = null) {
  if (!Array.isArray(data) || data.length === 0) {
    console.log('cleanAndSortData: empty or invalid data');
    return [];
  }

  console.log(`cleanAndSortData: input data length = ${data.length}`);

  // Remove any invalid entries and ensure proper numeric values
  const validData = data.filter(
    (item) =>
      item &&
      typeof item.time === 'number' &&
      !isNaN(item.time) &&
      item.time > 0 &&
      typeof item.open === 'number' &&
      typeof item.high === 'number' &&
      typeof item.low === 'number' &&
      typeof item.close === 'number'
  );

  console.log(`cleanAndSortData: valid data length = ${validData.length}`);

  // Sort by time in ascending order
  validData.sort((a, b) => a.time - b.time);

  // More aggressive deduplication - remove ANY duplicates
  const deduplicated = [];
  let lastTime = -1;

  for (const item of validData) {
    // Only add if timestamp is strictly greater than the last one
    if (item.time > lastTime) {
      deduplicated.push(item);
      lastTime = item.time;
    } else {
      console.log(
        `cleanAndSortData: skipping duplicate/out-of-order timestamp ${item.time} (last: ${lastTime})`
      );
    }
  }

  // Limit to the most recent maxCandles if specified
  let finalData = deduplicated;
  if (maxCandles && deduplicated.length > maxCandles) {
    finalData = deduplicated.slice(-maxCandles);
    console.log(
      `cleanAndSortData: limited to most recent ${maxCandles} candles`
    );
  }

  console.log(`cleanAndSortData: final data length = ${finalData.length}`);

  // Additional verification - check for any remaining duplicates
  for (let i = 1; i < finalData.length; i++) {
    if (finalData[i].time <= finalData[i - 1].time) {
      console.error(
        `cleanAndSortData: ERROR - found duplicate/out-of-order at index ${i}: current=${finalData[i].time}, prev=${finalData[i - 1].time}`
      );
    }
  }

  // If we have very few data points, log them for debugging
  if (finalData.length < 10) {
    console.log('cleanAndSortData: few data points, logging all:');
    finalData.forEach((item, index) => {
      console.log(`  [${index}] time=${item.time}, close=${item.close}`);
    });
  }

  return finalData;
}

async function fetchBitcoinData(timeframe) {
  const config = TIMEFRAME_CONFIG[timeframe];

  if (!config) {
    throw new Error(`Invalid timeframe: ${timeframe}`);
  }

  try {
    // Add delay to prevent rate limiting
    await delay(2000);

    let url, response, rawData;

    // Use market_chart endpoint for all timeframes
    url = `${BASE_URL}/coins/${BITCOIN_ID}/market_chart?vs_currency=usd&days=${config.days}`;
    response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const prices = data.prices || [];
    const volumes = data.total_volumes || [];

    // Sort price data by timestamp for proper sequencing
    const sortedPrices = prices
      .map((price, index) => ({
        timestamp: Math.floor(price[0] / 1000),
        price: parseFloat(price[1]),
        volume: parseFloat((volumes[index] || [0, 0])[1]) || 0,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Group into time intervals while maintaining sequence
    const groupedData = {};

    sortedPrices.forEach((item) => {
      // Group by time intervals based on timeframe
      let groupKey;
      if (timeframe === '5M') {
        groupKey = Math.floor(item.timestamp / 300) * 300; // 5-minute intervals
      } else if (timeframe === '1H') {
        groupKey = Math.floor(item.timestamp / 3600) * 3600; // 1-hour intervals
      } else if (timeframe === '4H') {
        groupKey = Math.floor(item.timestamp / 14400) * 14400; // 4-hour intervals
      } else if (timeframe === '1D') {
        groupKey = Math.floor(item.timestamp / 86400) * 86400; // 1-day intervals
      } else if (timeframe === '1W') {
        groupKey = Math.floor(item.timestamp / 604800) * 604800; // 1-week intervals
      } else {
        groupKey = item.timestamp;
      }

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          time: groupKey,
          prices: [],
          volumes: [],
        };
      }

      groupedData[groupKey].prices.push(item.price);
      groupedData[groupKey].volumes.push(item.volume);
    });

    // Convert grouped data to proper OHLC format maintaining price continuity
    const sortedGroups = Object.values(groupedData).sort(
      (a, b) => a.time - b.time
    );

    rawData = [];
    let previousClose = null;

    sortedGroups.forEach((group, index) => {
      const prices = group.prices;
      const volumes = group.volumes;

      if (prices.length === 0) return;

      // Calculate OHLC for this time period
      const open = previousClose !== null ? previousClose : prices[0];
      const high = Math.max(...prices);
      const low = Math.min(...prices);
      const close = prices[prices.length - 1];
      const avgVolume =
        volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;

      previousClose = close;

      rawData.push({
        time: group.time,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: parseFloat(avgVolume.toFixed(0)),
      });
    });

    console.log(
      `Successfully fetched and processed ${rawData.length} candles for ${timeframe}`
    );

    // Clean and return the data
    return cleanAndSortData(rawData, config.maxCandles);
  } catch (error) {
    console.error(`Error fetching Bitcoin data for ${timeframe}:`, error);
    throw error;
  }
}

async function getMarketData() {
  try {
    await delay(2000);

    const url = `${BASE_URL}/coins/${BITCOIN_ID}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const marketData = data.market_data;

    return {
      currentPrice: marketData.current_price.usd,
      priceChange: marketData.price_change_percentage_24h,
      volume: marketData.total_volume.usd,
      marketCap: marketData.market_cap.usd,
    };
  } catch (error) {
    console.error('Error fetching market data:', error);
    throw error;
  }
}

async function getOHLC(timeframe) {
  return await fetchBitcoinData(timeframe);
}

export { fetchBitcoinData, getMarketData, getOHLC };
