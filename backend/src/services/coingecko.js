const axios = require('axios');

const COINGECKO_BASE =
  process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const RATE_LIMIT_DELAY = 5000; // 5 seconds for rate limit errors

async function retryRequest(requestFn) {
  let lastError;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      if (error.response?.status === 429) {
        // Rate limit exceeded
        console.warn(
          `Rate limited. Waiting ${RATE_LIMIT_DELAY * (i + 1)}ms before retry ${i + 1}/${MAX_RETRIES}`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, RATE_LIMIT_DELAY * (i + 1))
        );
        continue;
      }
      if (error.response?.status >= 500) {
        // Server error
        console.warn(
          `Server error ${error.response.status}. Waiting ${RETRY_DELAY * (i + 1)}ms before retry ${i + 1}/${MAX_RETRIES}`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * (i + 1))
        );
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

class CoinGeckoService {
  async getMarketData() {
    console.log('Fetching market data from CoinGecko...');
    const url = `${COINGECKO_BASE}/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false&sparkline=false`;
    const { data } = await retryRequest(() => axios.get(url));
    return {
      currentPrice: data.market_data.current_price.usd,
      priceChange: data.market_data.price_change_percentage_24h,
      marketCap: data.market_data.market_cap.usd,
      volume: data.market_data.total_volume.usd,
      sentiment: data.sentiment_votes_up_percentage, // CoinGecko sentiment
    };
  }

  async getOHLC(timeframe = '1H') {
    console.log(`Fetching OHLC data for ${timeframe} from CoinGecko...`);
    // Map frontend timeframes to CoinGecko intervals
    const intervalMap = {
      '5M': 'minutely',
      '1H': 'hourly',
      '4H': 'hourly',
      '1D': 'daily',
      '1W': 'daily',
    };
    const daysMap = {
      '5M': 1,
      '1H': 1,
      '4H': 7,
      '1D': 30,
      '1W': 90,
    };
    const interval = intervalMap[timeframe] || 'hourly';
    const days = daysMap[timeframe] || 1;
    const url = `${COINGECKO_BASE}/coins/bitcoin/ohlc?vs_currency=usd&days=${days}`;
    const { data } = await retryRequest(() => axios.get(url));
    // Data format: [timestamp, open, high, low, close]
    return data.map(([time, open, high, low, close]) => ({
      time,
      open,
      high,
      low,
      close,
    }));
  }
}

module.exports = new CoinGeckoService();
