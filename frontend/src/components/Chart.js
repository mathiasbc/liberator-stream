import React, { useEffect, useRef, useMemo } from 'react';
import { Box, Flex, Text, useTheme } from '@chakra-ui/react';
import { createChart } from 'lightweight-charts';

const priceFormatter = (price) =>
  `$${Math.round(price).toLocaleString('en-US')}`;

const TIMEFRAMES = ['5M', '1H', '4H', '1D', '1W'];

const TIME_FORMATTERS = {
  hourMinute: (time) =>
    new Date(time * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }),
  monthDayHour: (time) =>
    new Date(time * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }),
  monthDay: (time) =>
    new Date(time * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
  monthDayYear: (time) =>
    new Date(time * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
      timeZone: 'UTC',
    }),
};

const TIME_CONFIG = {
  '5M': { formatter: TIME_FORMATTERS.hourMinute },
  '1H': { formatter: TIME_FORMATTERS.hourMinute },
  '4H': { formatter: TIME_FORMATTERS.monthDayHour },
  '1D': { formatter: TIME_FORMATTERS.monthDay },
  '1W': { formatter: TIME_FORMATTERS.monthDayYear },
};

const getViewportDims = () => {
  if (typeof window === 'undefined') return { width: 1280, height: 720 };
  return { width: window.innerWidth, height: window.innerHeight };
};

const getChartHeight = (width) => {
  if (width < 768) return 360;
  if (width < 1024) return 460;
  if (width < 1600) return 560;
  if (width < 2400) return 680;
  return 820;
};

const getFontSize = (width) => {
  if (width < 768) return 12;
  if (width < 1600) return 14;
  if (width < 2400) return 18;
  return 22;
};

const getBarSpacing = (width) => {
  if (width < 768) return 8;
  if (width < 1600) return 12;
  return 16;
};

const Chart = ({ sampleData, timeframe }) => {
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

    const { width } = getViewportDims();
    const timeFmt = TIME_CONFIG[timeframe] || TIME_CONFIG['1H'];

    const chart = createChart(chartContainerRef.current, {
      layout: {
        textColor: brand.pastelBlue,
        background: {
          type: 'gradient',
          topColor: '#0F0F0F',
          bottomColor: '#1A1A1A',
        },
        fontSize: getFontSize(width),
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      },
      watermark: { visible: false },
      grid: {
        vertLines: { color: 'rgba(93, 213, 255, 0.08)', style: 0 },
        horzLines: { color: 'rgba(93, 213, 255, 0.12)', style: 0 },
      },
      timeScale: {
        borderColor: brand.darkBorder,
        timeVisible: true,
        secondsVisible: false,
        barSpacing: getBarSpacing(width),
        minBarSpacing: 4,
        tickMarkFormatter: timeFmt.formatter,
      },
      localization: {
        timeFormatter: timeFmt.formatter,
        priceFormatter,
      },
      rightPriceScale: {
        borderColor: brand.darkBorder,
        textColor: brand.pastelBlue,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: getChartHeight(width),
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
          height: getChartHeight(dims.width),
          layout: {
            fontSize: getFontSize(dims.width),
            textColor: brand.pastelBlue,
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
      timeScale: { tickMarkFormatter: timeFmt.formatter },
      localization: { timeFormatter: timeFmt.formatter },
    });
  }, [timeframe]);

  // Push data updates without recreating the chart
  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(formattedData);
    chartRef.current?.timeScale().fitContent();
  }, [formattedData]);

  return (
    <Box position='relative'>
      <Box
        p={{ base: '14px', md: '18px', lg: '22px', xl: '28px' }}
        borderRadius={{ base: '12px', md: '16px' }}
        bgGradient='linear(135deg, brand.darkCard, #1F1F1F)'
        boxShadow='0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 brand.darkBorder'
        border='1px solid'
        borderColor='brand.darkBorder'
      >
        {/* Header */}
        <Flex
          direction={{ base: 'column', sm: 'row' }}
          justifyContent='space-between'
          alignItems={{ base: 'flex-start', sm: 'center' }}
          mb={{ base: '12px', md: '16px' }}
          pb={{ base: '10px', md: '12px' }}
          borderBottom='1px solid'
          borderColor='brand.darkBorder'
          gap={{ base: '12px', sm: '24px' }}
        >
          <Flex
            alignItems='center'
            gap={{ base: '16px', md: '24px' }}
            wrap='wrap'
          >
            <Text
              as='h3'
              fontSize={{
                base: '24px',
                sm: '28px',
                md: '32px',
                lg: '38px',
                xl: '46px',
              }}
              fontWeight='600'
              color='brand.pastelYellow'
              m={0}
              letterSpacing='-0.01em'
            >
              BTC/USD
            </Text>
            <Flex
              alignItems='center'
              gap='12px'
              fontSize={{ base: '16px', md: '18px', lg: '22px', xl: '26px' }}
            >
              <Text color='brand.pastelBlue'>Timeframe:</Text>
              <Box
                bg='brand.pastelPink'
                color='brand.darkBg'
                px={{ base: '10px', md: '14px', xl: '18px' }}
                py={{ base: '6px', md: '8px', xl: '10px' }}
                borderRadius='20px'
                fontWeight='600'
                fontSize={{ base: '14px', md: '16px', lg: '20px', xl: '24px' }}
              >
                {timeframe}
              </Box>
            </Flex>
          </Flex>

          {/* Auto-rotation indicator */}
          <Flex
            alignItems='center'
            gap='12px'
            p={{ base: '10px 14px', md: '12px 18px', xl: '14px 22px' }}
            borderRadius='12px'
            bg='rgba(255, 255, 255, 0.05)'
            border='1px solid'
            borderColor='brand.darkBorder'
            minW='fit-content'
            position='relative'
            overflow='hidden'
          >
            <Box
              position='absolute'
              top='0'
              left='0'
              right='0'
              bottom='0'
              bgGradient='linear(90deg, transparent, brand.pastelPink, brand.pastelYellow, brand.pastelMint, transparent)'
              opacity='0.25'
              animation='shimmer 3s ease-in-out infinite'
              sx={{
                '@keyframes shimmer': {
                  '0%': { transform: 'translateX(-100%)' },
                  '100%': { transform: 'translateX(100%)' },
                },
              }}
            />
            <Box position='relative' zIndex='1'>
              <Flex alignItems='center' gap='8px' wrap='wrap' justify='center'>
                {TIMEFRAMES.map((item, index) => {
                  const active = item === timeframe;
                  return (
                    <React.Fragment key={item}>
                      <Box
                        p={{ base: '4px 8px', md: '6px 10px', xl: '8px 14px' }}
                        borderRadius='6px'
                        bg={
                          active ? 'brand.pastelPink' : 'rgba(255,255,255,0.1)'
                        }
                        color={active ? 'brand.darkBg' : 'brand.pastelBlue'}
                        fontSize={{
                          base: '12px',
                          md: '14px',
                          lg: '16px',
                          xl: '20px',
                        }}
                        fontWeight={active ? '600' : '400'}
                        transition='all 0.3s ease'
                        boxShadow={
                          active ? '0 0 15px rgba(255,138,199,0.45)' : 'none'
                        }
                        transform={active ? 'scale(1.06)' : 'scale(1)'}
                      >
                        {item}
                      </Box>
                      {index < TIMEFRAMES.length - 1 && (
                        <Box
                          w='3px'
                          h='3px'
                          borderRadius='50%'
                          bg='brand.darkBorder'
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </Flex>
            </Box>
          </Flex>
        </Flex>

        {/* Chart container */}
        <Box
          ref={chartContainerRef}
          w='100%'
          h={{
            base: '360px',
            md: '460px',
            lg: '560px',
            xl: '680px',
            '2xl': '820px',
          }}
          borderRadius={{ base: '8px', md: '12px' }}
          overflow='hidden'
          position='relative'
          maxWidth='100%'
        />
      </Box>
    </Box>
  );
};

export default Chart;
