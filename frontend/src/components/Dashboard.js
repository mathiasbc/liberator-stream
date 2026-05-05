import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import PriceSection from './PriceSection';
import Chart from './Chart';

const WS_URL =
  process.env.REACT_APP_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
const RECONNECT_DELAY = 2000;

const INITIAL_DATA = {
  currentPrice: null,
  priceChange: null,
  volume: null,
  marketCap: null,
  blockHeight: null,
  marketDominance: null,
  totalSupply: null,
  extendedSupplyData: null,
  ohlcData: {},
  currentTimeframe: '5M',
};

const Dashboard = () => {
  const [data, setData] = useState(INITIAL_DATA);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log('[Dashboard] connecting WebSocket', WS_URL);
    const ws = new window.WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => console.log('[Dashboard] WebSocket open');

    ws.onmessage = (event) => {
      try {
        const incoming = JSON.parse(event.data);
        setData((prev) => ({ ...prev, ...incoming }));
        setSecondsSinceUpdate(0);
      } catch (e) {
        console.error('[Dashboard] parse error:', e);
      }
    };

    ws.onerror = (error) =>
      console.error('[Dashboard] WebSocket error:', error);

    ws.onclose = () => {
      console.log('[Dashboard] WebSocket closed; reconnecting...');
      reconnectTimeoutRef.current = setTimeout(
        connectWebSocket,
        RECONNECT_DELAY
      );
    };
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        // Prevent reconnect on intentional close
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsSinceUpdate((prev) => (prev < 999 ? prev + 1 : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const timeframe = data.currentTimeframe || '5M';
  const currentOhlcData = data.ohlcData?.[timeframe] || [];

  return (
    <Box
      width='100%'
      minHeight='100vh'
      maxWidth='100vw'
      overflowX='hidden'
      display='flex'
      flexDirection='column'
      bg='transparent'
    >
      <Box
        flex='1'
        px={{ base: '10px', sm: '14px', md: '18px', xl: '24px' }}
        py={{ base: '10px', sm: '12px', md: '14px', xl: '18px' }}
        maxWidth='100%'
        overflowX='hidden'
      >
        <PriceSection
          currentPrice={data.currentPrice || 0}
          priceChange={data.priceChange || 0}
          volume={data.volume || 0}
          marketCap={data.marketCap || 0}
          marketDominance={data.marketDominance}
          totalSupply={data.totalSupply}
          extendedSupplyData={data.extendedSupplyData}
          blockHeight={data.blockHeight}
          dayOpen={data.dayOpen}
          dayHigh={data.dayHigh}
          dayLow={data.dayLow}
          dayClose={data.dayClose}
        />
        <Chart
          sampleData={currentOhlcData}
          timeframe={timeframe}
          secondsSinceUpdate={secondsSinceUpdate}
        />
      </Box>
    </Box>
  );
};

export default Dashboard;
