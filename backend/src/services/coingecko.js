const axios = require('axios');

const BASE_URL = 'https://api.coingecko.com/api/v3';
const BITCOIN_ID = 'bitcoin';

const TIMEFRAME_CONFIG = {
  '5M': {
    endpoint: 'market_chart',
    days: 0.5,         // 12 hours of minutely data to create 5-min candles
    interval: null,    // Let CoinGecko auto-determine granularity
    description: '5-minute candles (last 4 hours)',
    maxCandles: 50
  },
  '1H': {
    endpoint: 'market_chart', 
    days: 3,           // 3 days of 5-minute data to create 1-hour candles
    interval: null,    // Let CoinGecko auto-determine granularity
    description: '1-hour candles (last 50 hours)',
    maxCandles: 50
  },
  '4H': {
    endpoint: 'market_chart',  // Switch from ohlc to market_chart to avoid 400 error
    days: 10,          // 10 days of hourly data to create 4-hour candles
    interval: null,    // Let CoinGecko auto-determine granularity
    description: '4-hour candles (last 200 hours)',
    maxCandles: 50
  },
  '1D': {
    endpoint: 'market_chart',
    days: 60,          // 60 days = daily data with some extra for processing
    interval: null,    // Let CoinGecko auto-determine granularity  
    description: '1-day candles (last 50 days)',
    maxCandles: 50
  },
  '1W': {
    endpoint: 'market_chart',
    days: 365,         // 365 days = ~52 weeks of data
    interval: null,    // Let CoinGecko auto-determine granularity
    description: '1-week view (last 50 weeks)',
    maxCandles: 50
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to clean and sort data for chart compatibility
function cleanAndSortData(data, maxCandles = null) {
  if (!Array.isArray(data) || data.length === 0) {
    console.log('cleanAndSortData: empty or invalid data');
    return [];
  }

  console.log(`cleanAndSortData: input data length = ${data.length}`);

  // Remove any invalid entries and ensure proper numeric values
  const validData = data.filter(item => 
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
      console.log(`cleanAndSortData: skipping duplicate/out-of-order timestamp ${item.time} (last: ${lastTime})`);
    }
  }

  // Limit to the most recent maxCandles if specified
  let finalData = deduplicated;
  if (maxCandles && deduplicated.length > maxCandles) {
    finalData = deduplicated.slice(-maxCandles); // Take the last maxCandles
    console.log(`cleanAndSortData: limited to most recent ${maxCandles} candles`);
  }

  console.log(`cleanAndSortData: final data length = ${finalData.length}`);
  
  // Additional verification - check for any remaining duplicates
  for (let i = 1; i < finalData.length; i++) {
    if (finalData[i].time <= finalData[i-1].time) {
      console.error(`cleanAndSortData: ERROR - found duplicate/out-of-order at index ${i}: current=${finalData[i].time}, prev=${finalData[i-1].time}`);
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
    await delay(1000); // Reduced delay since we're only fetching one coin
    
    let url, response, rawData;
    
    if (config.endpoint === 'ohlc') {
      // Use OHLC endpoint for native 4-hour data
      url = `${BASE_URL}/coins/${BITCOIN_ID}/ohlc?vs_currency=usd&days=${config.days}`;
      response = await axios.get(url);
      
      // OHLC format: [timestamp, open, high, low, close]
      rawData = response.data.map(item => ({
        time: Math.floor(item[0] / 1000), // Convert to seconds and ensure integer
        open: parseFloat(item[1]),
        high: parseFloat(item[2]), 
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: 0 // OHLC doesn't provide volume
      }));
      
    } else {
      // Use market_chart endpoint for native 5-min, hourly, and daily data
      url = `${BASE_URL}/coins/${BITCOIN_ID}/market_chart?vs_currency=usd&days=${config.days}`;
      response = await axios.get(url);
      
      const prices = response.data.prices || [];
      const volumes = response.data.total_volumes || [];
      
      // Sort price data by timestamp for proper sequencing
      const sortedPrices = prices
        .map((price, index) => ({
          timestamp: Math.floor(price[0] / 1000),
          price: parseFloat(price[1]),
          volume: parseFloat((volumes[index] || [0, 0])[1]) || 0
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
            volumes: []
          };
        }
        
        groupedData[groupKey].prices.push(item.price);
        groupedData[groupKey].volumes.push(item.volume);
      });
      
      // Convert grouped data to proper OHLC format maintaining price continuity
      const sortedGroups = Object.values(groupedData).sort((a, b) => a.time - b.time);
      
      rawData = [];
      let previousClose = null;
      
      sortedGroups.forEach((group, index) => {
        const prices = group.prices;
        const volumes = group.volumes;
        
        if (prices.length === 0) return;
        
        // Sort prices within the group to get proper sequence
        const sortedPrices = prices.slice().sort((a, b) => a - b);
        
        // Calculate OHLC with proper continuity
        const open = previousClose !== null ? previousClose : sortedPrices[0];
        const close = prices[prices.length - 1]; // Use the last price chronologically
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        
        // Ensure high >= max(open, close) and low <= min(open, close)
        const finalHigh = Math.max(high, open, close);
        const finalLow = Math.min(low, open, close);
        
        const candle = {
          time: group.time,
          open: open,
          high: finalHigh,
          low: finalLow,
          close: close,
          volume: volumes.reduce((sum, vol) => sum + vol, 0)
        };
        
        rawData.push(candle);
        previousClose = close; // Set for next candle's open
      });
    }
    
    // Clean, sort, and deduplicate the data
    return cleanAndSortData(rawData, config.maxCandles);
    
  } catch (error) {
    if (error.response?.status === 429) {
      console.log(`Rate limit hit for Bitcoin, waiting 10 seconds...`);
      await delay(10000);
      throw new Error(`Rate limited for Bitcoin`);
    }
    
    console.error(`Error fetching ${timeframe} data for Bitcoin:`, error.message);
    throw error;
  }
}

async function fetchAllCoinsData(timeframe) {
  console.log(`Fetching ${timeframe} data for Bitcoin only using native CoinGecko intervals...`);
  
  try {
    const data = await fetchBitcoinData(timeframe);
    console.log(`Successfully fetched ${timeframe} data for Bitcoin (${data.length} data points)`);
    
    // Return in the expected format with bitcoin key
    return {
      bitcoin: data
    };
  } catch (error) {
    console.error(`Failed to fetch ${timeframe} data for Bitcoin:`, error.message);
    return {
      bitcoin: []
    };
  }
}

// Method expected by scheduler for market data (price, volume, market cap)
async function getMarketData() {
  try {
    await delay(1000);
    
    const url = `${BASE_URL}/simple/price?ids=${BITCOIN_ID}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
    const response = await axios.get(url);
    
    const data = response.data[BITCOIN_ID];
    if (!data) {
      throw new Error('No market data received for Bitcoin');
    }
    
    return {
      currentPrice: data.usd || 0,
      priceChange: data.usd_24h_change || 0,
      volume: data.usd_24h_vol || 0,
      marketCap: data.usd_market_cap || 0
    };
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('Rate limit hit for market data, waiting 10 seconds...');
      await delay(10000);
      throw new Error('Rate limited for market data');
    }
    
    console.error('Error fetching market data:', error.message);
    throw error;
  }
}

// Method expected by scheduler for OHLC data
async function getOHLC(timeframe) {
  try {
    const data = await fetchBitcoinData(timeframe);
    return data; // Return the cleaned and sorted Bitcoin OHLC data
  } catch (error) {
    console.error(`Error fetching OHLC data for ${timeframe}:`, error.message);
    throw error;
  }
}

module.exports = {
  fetchAllCoinsData,
  fetchBitcoinData,
  getMarketData,
  getOHLC,
  TIMEFRAME_CONFIG
};

