import React, { useEffect, useRef } from 'react';
import { Box, Flex, Text, useTheme } from '@chakra-ui/react';
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

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const timeConfig = getTimeConfig(timeframe);

    // Chart configuration with dark theme
    const chartOptions = {
      layout: {
        textColor: brand.pastelBlue,
        background: {
          type: 'gradient',
          topColor: '#0F0F0F',
          bottomColor: '#1A1A1A',
        },
        fontSize: 14,
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
        barSpacing: 12, // Better spacing for candlestick visibility
        minBarSpacing: 6,
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
      height: 600,
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
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: 600,
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
        p='24px'
        borderRadius='16px'
        bgGradient='linear(135deg, brand.darkCard, #1F1F1F)'
        boxShadow='0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 brand.darkBorder'
        border='1px solid'
        borderColor='brand.darkBorder'
      >
        {/* Chart Header */}
        <Flex
          justifyContent='space-between'
          alignItems='center'
          mb='24px'
          pb='16px'
          borderBottom='1px solid'
          borderColor='brand.darkBorder'
        >
          <Flex alignItems='center' gap='24px'>
            <Text
              as='h3'
              fontSize='28px'
              fontWeight='600'
              color='brand.bitcoinOrange'
              m={0}
            >
              BTC/USD
            </Text>
            <Flex alignItems='center' gap='12px' fontSize='16px'>
              <Text color='brand.pastelBlue'>Timeframe:</Text>
              <Box
                bg='brand.pastelPink'
                color='brand.darkBg'
                px='12px'
                py='4px'
                borderRadius='20px'
                fontWeight='500'
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
          h='600px'
          borderRadius='12px'
          overflow='hidden'
        />

        {/* Chart Footer */}
        <Flex
          mt='24px'
          pt='16px'
          borderTop='1px solid'
          borderColor='brand.darkBorder'
          justifyContent='space-between'
          alignItems='center'
          fontSize='16px'
        >
          <Flex alignItems='center' gap='32px'>
            <Flex gap='4px'>
              <Text color='brand.pastelBlue'>Open:</Text>
              <Text
                fontWeight='500'
                fontFamily='monospace'
                color='brand.pastelYellow'
              >
                {formatPrice(sampleData[0]?.open || 0)}
              </Text>
            </Flex>
            <Flex gap='4px'>
              <Text color='brand.pastelBlue'>High:</Text>
              <Text
                fontWeight='500'
                fontFamily='monospace'
                color='brand.pastelGreen'
              >
                {formatPrice(Math.max(...sampleData.map((d) => d.high)))}
              </Text>
            </Flex>
            <Flex gap='4px'>
              <Text color='brand.pastelBlue'>Low:</Text>
              <Text
                fontWeight='500'
                fontFamily='monospace'
                color='brand.pastelCoral'
              >
                {formatPrice(Math.min(...sampleData.map((d) => d.low)))}
              </Text>
            </Flex>
            <Flex gap='4px'>
              <Text color='brand.pastelBlue'>Close:</Text>
              <Text
                fontWeight='500'
                fontFamily='monospace'
                color='brand.pastelYellow'
              >
                {formatPrice(sampleData[sampleData.length - 1]?.close || 0)}
              </Text>
            </Flex>
          </Flex>

          <Text fontStyle='italic' color='brand.pastelBlue'>
            Liberator dashboard
          </Text>
        </Flex>
      </Box>
    </Box>
  );
};

export default Chart;
