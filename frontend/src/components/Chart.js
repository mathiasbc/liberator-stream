import React, { useEffect, useRef } from 'react';
import { Box, Flex, Text, Grid, useTheme } from '@chakra-ui/react';
import { createChart } from 'lightweight-charts';

const Chart = ({ sampleData, timeframe }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const theme = useTheme();
  const { brand } = theme.colors;

  // Get time interval and formatting based on timeframe
  // Note: All time displays use UTC for consistency across YouTube stream viewers
  const getTimeConfig = (timeframe) => {
    const configs = {
      '5M': {
        interval: 300, // 5 minutes in seconds
        tickFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC',
          });
        },
        timeFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC',
          });
        },
      },
      '1H': {
        interval: 3600, // 1 hour in seconds
        tickFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC',
          });
        },
        timeFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC',
          });
        },
      },
      '4H': {
        interval: 14400, // 4 hours in seconds
        tickFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            hour12: false,
            timeZone: 'UTC',
          });
        },
        timeFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            hour12: false,
            timeZone: 'UTC',
          });
        },
      },
      '1D': {
        interval: 86400, // 1 day in seconds
        tickFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          });
        },
        timeFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          });
        },
      },
      '1W': {
        interval: 604800, // 1 week in seconds
        tickFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: '2-digit',
            timeZone: 'UTC',
          });
        },
        timeFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: '2-digit',
            timeZone: 'UTC',
          });
        },
      },
    };
    return configs[timeframe] || configs['1H'];
  };

  // Get responsive chart height
  const getChartHeight = () => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width < 768) return 400; // Mobile
      if (width < 1024) return 500; // Tablet
      return 600; // Desktop
    }
    return 600;
  };

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const timeConfig = getTimeConfig(timeframe);
    const chartHeight = getChartHeight();

    // Chart configuration with dark theme
    const chartOptions = {
      layout: {
        textColor: brand.pastelBlue,
        background: {
          type: 'gradient',
          topColor: '#0F0F0F',
          bottomColor: '#1A1A1A',
        },
        fontSize: window.innerWidth < 768 ? 12 : 14,
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      },
      watermark: {
        visible: false,
      },
      grid: {
        vertLines: {
          color: 'rgba(93, 213, 255, 0.1)',
          style: 0,
        },
        horzLines: {
          color: 'rgba(93, 213, 255, 0.15)',
          style: 0,
        },
      },
      timeScale: {
        borderColor: brand.darkBorder,
        timeVisible: true,
        secondsVisible: false,
        barSpacing: window.innerWidth < 768 ? 8 : 12, // Better spacing for mobile
        minBarSpacing: window.innerWidth < 768 ? 4 : 6,
        tickMarkFormatter: timeConfig.tickFormatter,
      },
      localization: {
        timeFormatter: timeConfig.timeFormatter,
      },
      rightPriceScale: {
        borderColor: brand.darkBorder,
        textColor: brand.pastelBlue,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartHeight,
    };

    // Create chart
    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    // Add candlestick series with proper styling
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: brand.pastelMint,
      downColor: brand.pastelCoral,
      borderUpColor: brand.pastelMint,
      borderDownColor: brand.pastelCoral,
      wickUpColor: brand.pastelMint,
      wickDownColor: brand.pastelCoral,
      priceScaleId: 'right',
    });
    seriesRef.current = candlestickSeries;

    // Convert data format for lightweight-charts using proper timestamps
    const formattedData = sampleData.map((item) => ({
      time: item.time, // Backend already provides timestamps in seconds
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    // Add debugging for chart data
    console.log(
      `Chart: formatting ${sampleData.length} data points for timeframe ${timeframe}`
    );
    if (formattedData.length > 0) {
      console.log(
        `Chart: first timestamp = ${formattedData[0].time}, last = ${formattedData[formattedData.length - 1].time}`
      );
    }

    // Verify data is sorted
    for (let i = 1; i < formattedData.length; i++) {
      if (formattedData[i].time <= formattedData[i - 1].time) {
        console.error(
          `Chart: ERROR - found duplicate/out-of-order timestamp at index ${i}: current=${formattedData[i].time}, prev=${formattedData[i - 1].time}`
        );
      }
    }

    candlestickSeries.setData(formattedData);
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        const newHeight = getChartHeight();
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: newHeight,
          layout: {
            fontSize: window.innerWidth < 768 ? 12 : 14,
          },
          timeScale: {
            barSpacing: window.innerWidth < 768 ? 8 : 12,
            minBarSpacing: window.innerWidth < 768 ? 4 : 6,
          },
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [sampleData, timeframe, brand]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <Box position='relative'>
      <Box
        p={{ base: '16px', md: '20px', lg: '24px' }}
        borderRadius={{ base: '12px', md: '16px' }}
        bgGradient='linear(135deg, brand.darkCard, #1F1F1F)'
        boxShadow='0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 brand.darkBorder'
        border='1px solid'
        borderColor='brand.darkBorder'
      >
        {/* Chart Header */}
        <Flex
          direction={{ base: 'column', sm: 'row' }}
          justifyContent='space-between'
          alignItems={{ base: 'flex-start', sm: 'center' }}
          mb={{ base: '16px', md: '24px' }}
          pb={{ base: '12px', md: '16px' }}
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
              fontSize={{ base: '20px', sm: '24px', md: '28px' }}
              fontWeight='600'
              color='brand.bitcoinOrange'
              m={0}
            >
              BTC/USD
            </Text>
            <Flex
              alignItems='center'
              gap='12px'
              fontSize={{ base: '14px', md: '16px' }}
            >
              <Text color='brand.pastelBlue'>Timeframe:</Text>
              <Box
                bg='brand.pastelPink'
                color='brand.darkBg'
                px={{ base: '8px', md: '12px' }}
                py='4px'
                borderRadius='20px'
                fontWeight='500'
                fontSize={{ base: '12px', md: '14px' }}
              >
                {timeframe}
              </Box>
            </Flex>
          </Flex>
        </Flex>

        {/* Chart Container */}
        <Box
          ref={chartContainerRef}
          w='100%'
          h={{ base: '400px', md: '500px', lg: '600px' }}
          borderRadius={{ base: '8px', md: '12px' }}
          overflow='hidden'
        />

        {/* Chart Footer */}
        <Flex
          mt={{ base: '16px', md: '24px' }}
          pt={{ base: '12px', md: '16px' }}
          borderTop='1px solid'
          borderColor='brand.darkBorder'
          direction={{ base: 'column', lg: 'row' }}
          justifyContent='space-between'
          alignItems={{ base: 'flex-start', lg: 'center' }}
          fontSize={{ base: '14px', md: '16px' }}
          gap={{ base: '16px', lg: '0' }}
        >
          <Grid
            templateColumns={{ base: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }}
            gap={{ base: '12px', sm: '16px', md: '32px' }}
            flex='1'
          >
            <Flex direction='column' gap='4px'>
              <Text
                color='brand.pastelBlue'
                fontSize={{ base: '12px', md: '14px' }}
              >
                Open:
              </Text>
              <Text
                fontWeight='500'
                fontFamily='monospace'
                color='brand.pastelYellow'
                fontSize={{ base: '14px', md: '16px' }}
              >
                {formatPrice(sampleData[0]?.open || 0)}
              </Text>
            </Flex>
            <Flex direction='column' gap='4px'>
              <Text
                color='brand.pastelBlue'
                fontSize={{ base: '12px', md: '14px' }}
              >
                High:
              </Text>
              <Text
                fontWeight='500'
                fontFamily='monospace'
                color='brand.pastelGreen'
                fontSize={{ base: '14px', md: '16px' }}
              >
                {formatPrice(Math.max(...sampleData.map((d) => d.high)))}
              </Text>
            </Flex>
            <Flex direction='column' gap='4px'>
              <Text
                color='brand.pastelBlue'
                fontSize={{ base: '12px', md: '14px' }}
              >
                Low:
              </Text>
              <Text
                fontWeight='500'
                fontFamily='monospace'
                color='brand.pastelCoral'
                fontSize={{ base: '14px', md: '16px' }}
              >
                {formatPrice(Math.min(...sampleData.map((d) => d.low)))}
              </Text>
            </Flex>
            <Flex direction='column' gap='4px'>
              <Text
                color='brand.pastelBlue'
                fontSize={{ base: '12px', md: '14px' }}
              >
                Close:
              </Text>
              <Text
                fontWeight='500'
                fontFamily='monospace'
                color='brand.pastelYellow'
                fontSize={{ base: '14px', md: '16px' }}
              >
                {formatPrice(sampleData[sampleData.length - 1]?.close || 0)}
              </Text>
            </Flex>
          </Grid>

          <Text
            fontStyle='italic'
            color='brand.pastelBlue'
            fontSize={{ base: '12px', md: '14px' }}
            mt={{ base: '8px', lg: '0' }}
            alignSelf={{ base: 'center', lg: 'auto' }}
          >
            Liberator dashboard
          </Text>
        </Flex>
      </Box>
    </Box>
  );
};

export default Chart;
