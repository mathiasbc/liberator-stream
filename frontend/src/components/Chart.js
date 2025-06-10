import React, { useEffect, useRef } from 'react';
import { Box, Flex, Text, useTheme } from '@chakra-ui/react';
import { createChart } from 'lightweight-charts';

const Chart = ({ sampleData, timeframe }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const theme = useTheme();
  const { brand } = theme.colors;

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Chart configuration with dark theme
    const chartOptions = {
      layout: {
        textColor: brand.pastelBlue,
        background: {
          type: 'gradient',
          topColor: '#0F0F0F',
          bottomColor: '#1A1A1A',
        },
        fontSize: 12,
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
      height: 450,
    };

    // Create chart
    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    // Add bar series with custom colors
    const barSeries = chart.addBarSeries({
      upColor: brand.pastelMint,
      downColor: brand.pastelCoral,
      openVisible: true,
      thinBars: true,
    });
    seriesRef.current = barSeries;

    // Convert data format for lightweight-charts (use Unix timestamps)
    const baseTime = Math.floor(Date.now() / 1000) - (sampleData.length * 900); // 15-minute intervals
    const formattedData = sampleData.map((item, index) => ({
      time: baseTime + (index * 900), // 15-minute intervals in seconds
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    barSeries.setData(formattedData);
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: 450,
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
  }, [sampleData, brand]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <Box position="relative">
      <Box
        p="24px"
        borderRadius="16px"
        bgGradient="linear(135deg, brand.darkCard, #1F1F1F)"
        boxShadow="0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 brand.darkBorder"
        border="1px solid"
        borderColor="brand.darkBorder"
      >
        {/* Chart Header */}
        <Flex
          justifyContent="space-between"
          alignItems="center"
          mb="24px"
          pb="16px"
          borderBottom="1px solid"
          borderColor="brand.darkBorder"
        >
          <Flex alignItems="center" gap="24px">
            <Text
              as="h3"
              fontSize="24px"
              fontWeight="500"
              color="brand.pastelYellow"
              m={0}
            >
              BTC/USD Chart
            </Text>
            <Flex alignItems="center" gap="12px" fontSize="14px">
              <Text color="brand.pastelBlue">Timeframe:</Text>
              <Box
                bg="brand.pastelPink"
                color="brand.darkBg"
                px="12px"
                py="4px"
                borderRadius="20px"
                fontWeight="500"
              >
                {timeframe}
              </Box>
            </Flex>
          </Flex>
        </Flex>

        {/* Chart Container */}
        <Box 
          ref={chartContainerRef}
          w="100%" 
          h="450px"
          borderRadius="12px"
          overflow="hidden"
        />

        {/* Chart Footer */}
        <Flex
          mt="24px"
          pt="16px"
          borderTop="1px solid"
          borderColor="brand.darkBorder"
          justifyContent="space-between"
          alignItems="center"
          fontSize="14px"
        >
          <Flex alignItems="center" gap="32px">
            <Flex gap="4px">
              <Text color="brand.pastelBlue">Open:</Text>
              <Text fontWeight="500" fontFamily="monospace" color="brand.pastelYellow">
                {formatPrice(sampleData[0]?.open || 0)}
              </Text>
            </Flex>
            <Flex gap="4px">
              <Text color="brand.pastelBlue">High:</Text>
              <Text fontWeight="500" fontFamily="monospace" color="brand.pastelGreen">
                {formatPrice(Math.max(...sampleData.map(d => d.high)))}
              </Text>
            </Flex>
            <Flex gap="4px">
              <Text color="brand.pastelBlue">Low:</Text>
              <Text fontWeight="500" fontFamily="monospace" color="brand.pastelCoral">
                {formatPrice(Math.min(...sampleData.map(d => d.low)))}
              </Text>
            </Flex>
            <Flex gap="4px">
              <Text color="brand.pastelBlue">Close:</Text>
              <Text fontWeight="500" fontFamily="monospace" color="brand.pastelYellow">
                {formatPrice(sampleData[sampleData.length - 1]?.close || 0)}
              </Text>
            </Flex>
          </Flex>
          
          <Text fontStyle="italic" color="brand.pastelBlue">
            Liberator dashboard
          </Text>
        </Flex>
      </Box>
    </Box>
  );
};

export default Chart;
