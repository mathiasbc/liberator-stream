import React, { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import Header from './Header';
import PriceSection from './PriceSection';
import Chart from './Chart';
import StatsGrid from './StatsGrid';

const Dashboard = () => {
  const [currentPrice, setCurrentPrice] = useState(45280.50);
  const [priceChange, setPriceChange] = useState(-1.28);
  const [volume, setVolume] = useState('1.2B');
  const [blockHeight, setBlockHeight] = useState(825749);
  const [timeframe, setTimeframe] = useState('1H');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Generate 50 sample candlestick data points with realistic price movement
  const generateSampleData = () => {
    const data = [];
    let basePrice = 44000;
    const volatility = 500; // Price volatility range
    
    for (let i = 0; i < 50; i++) {
      const hours = Math.floor(i / 4);
      const minutes = (i % 4) * 15;
      const timeStr = `${String(hours + 3).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      
      // Generate realistic OHLC data
      const trend = Math.sin(i * 0.1) * 200; // Overall trend
      const noise = (Math.random() - 0.5) * volatility; // Random noise
      
      const open = basePrice + trend + noise;
      const changeRange = 100 + Math.random() * 300; // Range of price movement
      const high = open + Math.random() * changeRange;
      const low = open - Math.random() * changeRange;
      
      // Close price with bias towards trend
      const closeBias = Math.random() > 0.4 ? 1 : -1; // 60% bullish bias
      const close = open + (closeBias * Math.random() * changeRange * 0.7);
      
      data.push({
        time: timeStr,
        open: Math.round(open),
        high: Math.round(Math.max(open, high, close)),
        low: Math.round(Math.min(open, low, close)),
        close: Math.round(close)
      });
      
      // Update base price for next candle to create continuity
      basePrice = Math.round(close);
    }
    
    return data;
  };

  const sampleData = generateSampleData();

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      const change = (Math.random() - 0.5) * 100;
      setCurrentPrice(prev => Math.max(0, prev + change));
      setPriceChange((Math.random() - 0.5) * 5);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box minHeight="100vh">
      <Header blockHeight={blockHeight} lastUpdate={lastUpdate} />
      
      <Box p="32px">
        <PriceSection
          currentPrice={currentPrice}
          priceChange={priceChange}
          volume={volume}
          marketCap="$891.2B"
          timeframe={timeframe}
          setTimeframe={setTimeframe}
        />
        
        <Chart sampleData={sampleData} timeframe={timeframe} />
        
        <StatsGrid />
      </Box>
    </Box>
  );
};

export default Dashboard; 