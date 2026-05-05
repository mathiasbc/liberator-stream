import React, { useEffect, useRef, useMemo } from 'react';
import { Box, Flex, Text, useTheme } from '@chakra-ui/react';
import { createChart } from 'lightweight-charts';

const priceFormatter = (price) =>
  `$${Math.round(price).toLocaleString('en-US')}`;

const TIMEFRAMES = ['5M', '1H', '4H', '1D', '1W'];

// lightweight-charts TickMarkType:
//   0 = Year, 1 = Month, 2 = DayOfMonth, 3 = Time, 4 = TimeWithSeconds
// Pick the format per tick level so day-aligned ticks don't read "May 1 00:00".
const fmtMonth = (d) =>
  d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
const fmtHour = (d) => `${String(d.getUTCHours()).padStart(2, '0')}:00`;
const fmtHourMinute = (d) =>
  `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

const formatTick = (time, tickMarkType, granularity) => {
  const d = new Date(time * 1000);
  switch (tickMarkType) {
    case 0:
      return String(d.getUTCFullYear());
    case 1:
      return `${fmtMonth(d)} '${String(d.getUTCFullYear()).slice(-2)}`;
    case 2:
      return `${fmtMonth(d)} ${d.getUTCDate()}`;
    case 3:
      return granularity === '5M' ? fmtHourMinute(d) : fmtHour(d);
    default:
      return granularity === '5M'
        ? fmtHourMinute(d)
        : `${fmtMonth(d)} ${d.getUTCDate()}`;
  }
};

const TIME_FORMATTERS = {
  intraday5: (time, tmt) => formatTick(time, tmt, '5M'),
  intradayHour: (time, tmt) => formatTick(time, tmt, '1H'),
  multiDay: (time, tmt) => formatTick(time, tmt, '4H'),
  daily: (time, tmt) => formatTick(time, tmt, '1D'),
  weekly: (time, tmt) => formatTick(time, tmt, '1W'),
};

// Crosshair label — always show date + time so hover info is complete
const crosshairTime5M = (time) => {
  const d = new Date(time * 1000);
  return `${fmtMonth(d)} ${d.getUTCDate()} ${fmtHourMinute(d)} UTC`;
};
const crosshairTimeHourly = (time) => {
  const d = new Date(time * 1000);
  return `${fmtMonth(d)} ${d.getUTCDate()} ${fmtHour(d)} UTC`;
};
const crosshairDay = (time) => {
  const d = new Date(time * 1000);
  return `${fmtMonth(d)} ${d.getUTCDate()}, ${d.getUTCFullYear()} UTC`;
};

const TIME_CONFIG = {
  '5M': {
    tick: TIME_FORMATTERS.intraday5,
    crosshair: crosshairTime5M,
  },
  '1H': {
    tick: TIME_FORMATTERS.intradayHour,
    crosshair: crosshairTimeHourly,
  },
  '4H': {
    tick: TIME_FORMATTERS.multiDay,
    crosshair: crosshairTimeHourly,
  },
  '1D': {
    tick: TIME_FORMATTERS.daily,
    crosshair: crosshairDay,
  },
  '1W': {
    tick: TIME_FORMATTERS.weekly,
    crosshair: crosshairDay,
  },
};

const getViewportDims = () => {
  if (typeof window === 'undefined') return { width: 1280, height: 720 };
  return { width: window.innerWidth, height: window.innerHeight };
};

const getChartHeight = (width, height) => {
  // Header card ~ 180px, page padding/gaps ~ 60px, chart card chrome ~ 80px.
  const reserved = 320;
  const cap = Math.max(280, (height || 1080) - reserved);
  if (width < 768) return Math.min(380, cap);
  if (width < 1024) return Math.min(480, cap);
  if (width < 1600) return Math.min(620, cap);
  if (width < 2400) return Math.min(760, cap);
  return Math.min(900, cap);
};

const getFontSize = (width) => {
  if (width < 768) return 11;
  if (width < 1600) return 13;
  if (width < 2400) return 15;
  return 18;
};

const getBarSpacing = (width) => {
  if (width < 768) return 7;
  if (width < 1600) return 10;
  return 13;
};

const Chart = ({ sampleData, timeframe, secondsSinceUpdate = 0 }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const theme = useTheme();
  const { brand } = theme.colors;

  const formattedData = useMemo(
    () =>
      (sampleData || []).map((item) => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      })),
    [sampleData]
  );

  // Initialize chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const { width, height } = getViewportDims();
    const timeFmt = TIME_CONFIG[timeframe] || TIME_CONFIG['1H'];

    const axisColor = 'rgba(255, 255, 255, 0.6)';

    const chart = createChart(chartContainerRef.current, {
      layout: {
        textColor: axisColor,
        background: {
          type: 'gradient',
          topColor: brand.darkBg,
          bottomColor: brand.darkCard,
        },
        fontSize: getFontSize(width),
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      },
      watermark: { visible: false },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)', style: 0 },
        horzLines: { color: 'rgba(255, 255, 255, 0.07)', style: 0 },
      },
      timeScale: {
        borderColor: brand.darkBorder,
        timeVisible: true,
        secondsVisible: false,
        barSpacing: getBarSpacing(width),
        minBarSpacing: 4,
        tickMarkFormatter: timeFmt.tick,
      },
      localization: {
        timeFormatter: timeFmt.crosshair,
        priceFormatter,
      },
      rightPriceScale: {
        borderColor: brand.darkBorder,
        textColor: axisColor,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: getChartHeight(width, height),
    });
    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: brand.pastelMint,
      downColor: brand.pastelCoral,
      borderUpColor: brand.pastelMint,
      borderDownColor: brand.pastelCoral,
      wickUpColor: brand.pastelMint,
      wickDownColor: brand.pastelCoral,
      priceScaleId: 'right',
      priceFormat: {
        type: 'custom',
        formatter: priceFormatter,
        minMove: 1,
      },
    });
    seriesRef.current = candlestickSeries;

    let resizeTimeout;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (!chartRef.current || !chartContainerRef.current) return;
        const dims = getViewportDims();
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: getChartHeight(dims.width, dims.height),
          layout: {
            fontSize: getFontSize(dims.width),
            textColor: axisColor,
          },
          timeScale: { barSpacing: getBarSpacing(dims.width) },
        });
        chartRef.current.timeScale().fitContent();
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  // Apply timeframe-specific formatter without rebuilding the chart
  useEffect(() => {
    if (!chartRef.current) return;
    const timeFmt = TIME_CONFIG[timeframe] || TIME_CONFIG['1H'];
    chartRef.current.applyOptions({
      timeScale: { tickMarkFormatter: timeFmt.tick },
      localization: { timeFormatter: timeFmt.crosshair },
    });
  }, [timeframe]);

  // Push data updates without recreating the chart
  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(formattedData);
    chartRef.current?.timeScale().fitContent();
  }, [formattedData]);

  const freshnessColor =
    secondsSinceUpdate <= 30
      ? 'brand.pastelMint'
      : secondsSinceUpdate <= 90
        ? 'brand.pastelYellow'
        : 'brand.pastelCoral';
  const freshnessGlow =
    secondsSinceUpdate <= 30
      ? 'rgba(127,223,184,0.55)'
      : secondsSinceUpdate <= 90
        ? 'rgba(255,213,79,0.55)'
        : 'rgba(255,122,133,0.55)';

  return (
    <Box position='relative'>
      <Box
        p={{ base: '12px', md: '14px', lg: '16px', xl: '20px' }}
        borderRadius={{ base: '12px', md: '14px' }}
        bgGradient='linear(135deg, brand.darkCard, brand.darkBorder)'
        boxShadow='0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 brand.darkBorder'
        border='1px solid'
        borderColor='brand.darkBorder'
      >
        {/* Header */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justifyContent='space-between'
          alignItems={{ base: 'flex-start', md: 'center' }}
          mb={{ base: '8px', md: '10px', xl: '12px' }}
          pb={{ base: '8px', md: '10px' }}
          borderBottom='1px solid'
          borderColor='brand.darkBorder'
          gap={{ base: '14px', md: '24px' }}
        >
          {/* Live + Refreshed */}
          <Flex
            alignItems='center'
            gap={{ base: '16px', md: '24px', xl: '32px' }}
            wrap='wrap'
          >
            <Flex alignItems='center' gap='10px'>
              <Box
                w={{ base: '12px', md: '14px', xl: '16px' }}
                h={{ base: '12px', md: '14px', xl: '16px' }}
                borderRadius='50%'
                bg={freshnessColor}
                animation='pulse 2s infinite'
                boxShadow={`0 0 12px ${freshnessGlow}`}
              />
              <Text
                fontSize={{ base: '14px', md: '16px', xl: '18px' }}
                fontWeight='600'
                color='brand.bitcoinOrange'
                letterSpacing='0.04em'
                textTransform='uppercase'
              >
                Live
              </Text>
            </Flex>

            <Flex alignItems='baseline' gap='10px'>
              <Text
                fontSize={{ base: '12px', md: '13px', xl: '15px' }}
                fontWeight='400'
                color='rgba(255,255,255,0.55)'
                letterSpacing='0.06em'
                textTransform='uppercase'
              >
                Refreshed
              </Text>
              <Text
                fontFamily='monospace'
                fontSize={{ base: '14px', md: '16px', xl: '18px' }}
                fontWeight='500'
                color={freshnessColor}
              >
                {secondsSinceUpdate}s ago
              </Text>
            </Flex>
          </Flex>

          {/* Timeframe selector */}
          <Flex
            alignItems='center'
            gap={{ base: '8px', md: '12px', xl: '16px' }}
          >
            {TIMEFRAMES.map((item) => {
              const active = item === timeframe;
              return (
                <Flex
                  key={item}
                  alignItems='center'
                  justifyContent='center'
                  px={{ base: '8px', md: '12px', xl: '14px' }}
                  py={{ base: '4px', md: '5px', xl: '6px' }}
                  minW={{ base: '40px', md: '48px', xl: '56px' }}
                  borderRadius='6px'
                  border='2px solid'
                  borderColor={active ? 'brand.pastelYellow' : 'transparent'}
                  bg={active ? 'rgba(255,213,79,0.10)' : 'transparent'}
                  boxShadow={active ? '0 0 14px rgba(255,213,79,0.30)' : 'none'}
                  transition='all 0.25s ease'
                >
                  <Text
                    fontFamily='monospace'
                    fontSize={{
                      base: '14px',
                      md: '16px',
                      xl: '18px',
                    }}
                    fontWeight={active ? '700' : '400'}
                    color={active ? 'brand.pastelYellow' : 'brand.pastelBlue'}
                    opacity={active ? 1 : 0.45}
                    letterSpacing='0.02em'
                    lineHeight='1'
                  >
                    {item}
                  </Text>
                </Flex>
              );
            })}
          </Flex>
        </Flex>

        {/* Chart container */}
        <Box position='relative'>
          <Box
            ref={chartContainerRef}
            w='100%'
            h={{
              base: '380px',
              md: '480px',
              lg: '560px',
              xl: '700px',
              '2xl': '860px',
            }}
            borderRadius={{ base: '8px', md: '12px' }}
            overflow='hidden'
            position='relative'
            maxWidth='100%'
          />
          <Flex
            position='absolute'
            top={{ base: '8px', md: '12px', xl: '16px' }}
            left={{ base: '8px', md: '12px', xl: '18px' }}
            alignItems='center'
            gap='6px'
            px={{ base: '8px', md: '10px', xl: '14px' }}
            py={{ base: '4px', md: '5px', xl: '7px' }}
            borderRadius='6px'
            bg='rgba(0, 0, 0, 0.65)'
            border='1px solid'
            borderColor='brand.darkBorder'
            backdropFilter='blur(4px)'
            pointerEvents='none'
            zIndex='2'
          >
            <Text
              fontSize={{ base: '9px', md: '10px', xl: '12px' }}
              fontWeight='400'
              color='rgba(255,255,255,0.55)'
              letterSpacing='0.1em'
              textTransform='uppercase'
              lineHeight='1'
            >
              Time
            </Text>
            <Text
              fontFamily='monospace'
              fontSize={{ base: '11px', md: '13px', xl: '15px' }}
              fontWeight='700'
              color='brand.pastelYellow'
              letterSpacing='0.1em'
              lineHeight='1'
            >
              UTC
            </Text>
          </Flex>
        </Box>
      </Box>
    </Box>
  );
};

export default Chart;
