import React, { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import Header from './Header';
import PriceSection from './PriceSection';
import Chart from './Chart';
import StatsGrid from './StatsGrid';

// Generate 50 sample candlestick data points with realistic price movement
const generateSampleData = () => {
  const data = [];
  let basePrice = 44000;
  const volatility = 500;
  
  for (let i = 0; i < 50; i++) {
    const hours = Math.floor(i / 4);
    const minutes = (i % 4) * 15;
    const timeStr = `${String(hours + 3).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    const trend = Math.sin(i * 0.1) * 200;
    const noise = (Math.random() - 0.5) * volatility;
    const open = basePrice + trend + noise;
    const changeRange = 100 + Math.random() * 300;
    const high = open + Math.random() * changeRange;
    const low = open - Math.random() * changeRange;
    const closeBias = Math.random() > 0.4 ? 1 : -1;
    const close = open + (closeBias * Math.random() * changeRange * 0.7);
    
    data.push({
      time: timeStr,
      open: Math.round(open),
      high: Math.round(Math.max(open, high, close)),
      low: Math.round(Math.min(open, low, close)),
      close: Math.round(close)
    });
    
    basePrice = Math.round(close);
  }
  
  return data;
};

const sampleData = generateSampleData();

const Dashboard = () => {
  const [currentPrice, setCurrentPrice] = useState(45280.50);
  const [priceChange, setPriceChange] = useState(-1.28);
  const [volume] = useState('1.2B');
  const [blockHeight] = useState(825749);
  const [timeframe, setTimeframe] = useState('1H');
  const [lastUpdate, setLastUpdate] = useState(new Date());

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