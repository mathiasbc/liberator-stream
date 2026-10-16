import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import Stage from './Stage';
import OnAirBar from './OnAirBar';
import PriceSection from './PriceSection';
import Chart from './Chart';
import SocialWire from './SocialWire';
import NetworkPulse from './NetworkPulse';
import Ticker from './Ticker';

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
  globalMarketData: null,
  networkData: null,
  ohlcData: {},
  currentTimeframe: '5M',
  timeframeRotatedAt: null,
  timeframeRotationMs: null,
  tweets: null,
};

const Dashboard = () => {
  const [data, setData] = useState(INITIAL_DATA);
  const [lastMarketAt, setLastMarketAt] = useState(null);
  const [connected, setConnected] = useState(false);
  // Round numbers crossed and new 24H highs/lows, for the ticker
  const [moments, setMoments] = useState([]);
  const addMoment = useCallback((moment) => {
    setMoments((prev) => [...prev, moment].slice(-5));
  }, []);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastMarketRef = useRef({ price: null, volume: null });

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log('[Dashboard] connecting WebSocket', WS_URL);
    const ws = new window.WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Dashboard] WebSocket open');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const incoming = JSON.parse(event.data);
        // Count the market as live only when it actually moved; a rotation
        // snapshot re-sends the old price and shouldn't hide a stall
        const last = lastMarketRef.current;
        if (
          incoming.currentPrice !== undefined &&
          (incoming.currentPrice !== last.price ||
            incoming.volume !== last.volume)
        ) {
          lastMarketRef.current = {
            price: incoming.currentPrice,
            volume: incoming.volume,
          };
          setLastMarketAt(Date.now());
        }
        setData((prev) => ({ ...prev, ...incoming }));
      } catch (e) {
        console.error('[Dashboard] parse error:', e);
      }
    };

    ws.onerror = (error) =>
      console.error('[Dashboard] WebSocket error:', error);

    ws.onclose = () => {
      console.log('[Dashboard] WebSocket closed; reconnecting...');
      setConnected(false);
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

  return (
    <Stage>
      <Flex direction='column' h='100%'>
        <OnAirBar lastMarketAt={lastMarketAt} connected={connected} />
        <Box px='28px' pt='18px' flex='none'>
          <PriceSection data={data} onMoment={addMoment} />
        </Box>
        <Flex flex='1' minH={0} gap='18px' px='28px' py='18px'>
          <Box flex='1' minW={0}>
            <Chart
              ohlcData={data.ohlcData}
              timeframe={data.currentTimeframe || '5M'}
              livePrice={data.currentPrice}
              rotatedAt={data.timeframeRotatedAt}
              rotationMs={data.timeframeRotationMs}
            />
          </Box>
          <Flex w='470px' flex='none' direction='column' gap='18px'>
            <NetworkPulse
              blockHeight={data.blockHeight}
              networkData={data.networkData}
              price={data.currentPrice}
            />
            <SocialWire tweets={data.tweets} />
          </Flex>
        </Flex>
        <Ticker data={data} moments={moments} />
      </Flex>
    </Stage>
  );
};

export default Dashboard;
