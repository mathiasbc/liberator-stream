import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import Header from './Header';
import PriceSection from './PriceSection';
import Chart from './Chart';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';
const RECONNECT_DELAY = 2000;

const Dashboard = () => {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [volume, setVolume] = useState(null);
  const [marketCap, setMarketCap] = useState(null);
  const [blockHeight, setBlockHeight] = useState(null);
  const [marketDominance, setMarketDominance] = useState(null);
  const [totalSupply, setTotalSupply] = useState(null);
  const [extendedSupplyData, setExtendedSupplyData] = useState(null);
  const [ohlcData, setOhlcData] = useState({});
  const [timeframe, setTimeframe] = useState('5M'); // This will be controlled by backend
  // Note: All timestamps in this app use UTC for consistency across YouTube stream viewers
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('Connecting to WebSocket...');
    wsRef.current = new window.WebSocket(WS_URL);

    wsRef.current.onopen = () => {
      console.log('WebSocket connection established');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket data:', data);

        let hasUpdate = false;

        if (
          data.currentPrice !== undefined &&
          data.currentPrice !== currentPrice
        ) {
          setCurrentPrice(data.currentPrice);
          hasUpdate = true;
        }
        if (
          data.priceChange !== undefined &&
          data.priceChange !== priceChange
        ) {
          setPriceChange(data.priceChange);
          hasUpdate = true;
        }
        if (data.volume !== undefined && data.volume !== volume) {
          setVolume(data.volume);
          hasUpdate = true;
        }
        if (data.marketCap !== undefined && data.marketCap !== marketCap) {
          setMarketCap(data.marketCap);
          hasUpdate = true;
        }
        if (
          data.blockHeight !== undefined &&
          data.blockHeight !== blockHeight
        ) {
          setBlockHeight(data.blockHeight);
          hasUpdate = true;
        }
        if (
          data.marketDominance !== undefined &&
          data.marketDominance !== marketDominance
        ) {
          setMarketDominance(data.marketDominance);
          hasUpdate = true;
        }
        if (
          data.totalSupply !== undefined &&
          JSON.stringify(data.totalSupply) !== JSON.stringify(totalSupply)
        ) {
          setTotalSupply(data.totalSupply);
          hasUpdate = true;
        }
        if (
          data.extendedSupplyData !== undefined &&
          JSON.stringify(data.extendedSupplyData) !==
            JSON.stringify(extendedSupplyData)
        ) {
          setExtendedSupplyData(data.extendedSupplyData);
          hasUpdate = true;
        }
        if (data.ohlcData !== undefined) {
          setOhlcData(data.ohlcData);
          hasUpdate = true;
        }

        // Update timeframe from backend
        if (
          data.currentTimeframe !== undefined &&
          data.currentTimeframe !== timeframe
        ) {
          setTimeframe(data.currentTimeframe);
          hasUpdate = true;
        }

        if (hasUpdate) {
          console.log('Dashboard updated with new data');
          setLastUpdate(new Date());
          setSecondsSinceUpdate(0);
        }
      } catch (e) {
        console.error('Error parsing WebSocket data:', e);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed. Reconnecting...');
      reconnectTimeoutRef.current = setTimeout(
        connectWebSocket,
        RECONNECT_DELAY
      );
    };
  }, [
    currentPrice,
    priceChange,
    volume,
    marketCap,
    blockHeight,
    marketDominance,
    totalSupply,
    extendedSupplyData,
    timeframe,
  ]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current && wsRef.current.close();
    };
  }, [connectWebSocket]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsSinceUpdate((prev) => (prev < 60 ? prev + 1 : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get the current timeframe data
  const currentOhlcData = ohlcData[timeframe] || [];

  return (
    <Box minHeight='100vh'>
      <Header
        blockHeight={blockHeight || 0}
        lastUpdate={lastUpdate}
        secondsSinceUpdate={secondsSinceUpdate}
      />
      <Box p='32px'>
        <PriceSection
          currentPrice={currentPrice || 0}
          priceChange={priceChange || 0}
          volume={volume || 0}
          marketCap={marketCap || 0}
          timeframe={timeframe}
          marketDominance={marketDominance}
          totalSupply={totalSupply}
          extendedSupplyData={extendedSupplyData}
          blockHeight={blockHeight}
        />
        <Chart sampleData={currentOhlcData} timeframe={timeframe} />
      </Box>
    </Box>
  );
};

export default Dashboard;
