import React from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';

const PriceSection = ({
  currentPrice,
  priceChange,
  volume,
  marketCap,
  timeframe,
  setTimeframe,
}) => {
  const timeframes = ['15M', '1H', '4H', '1D', '1W'];

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <Flex mb="32px" justifyContent="space-between" alignItems="center">
      <Flex alignItems="center" gap="48px">
        <Flex flexDirection="column" gap="8px">
          <Text
            as="h2"
            fontSize="64px"
            fontWeight="300"
            color="brand.pastelYellow"
            m={0}
          >
            {formatPrice(currentPrice)}
          </Text>
          <Flex alignItems="center" gap="12px">
            <Text
              fontSize="24px"
              color={priceChange >= 0 ? 'brand.pastelGreen' : 'brand.pastelCoral'}
            >
              {priceChange >= 0 ? '↗' : '↘'}
            </Text>
            <Text
              fontSize="20px"
              fontWeight="500"
              color={priceChange >= 0 ? 'brand.pastelGreen' : 'brand.pastelCoral'}
            >
              {priceChange >= 0 ? '+' : ''}
              {priceChange.toFixed(2)}%
            </Text>
            <Text fontSize="20px" fontWeight="300" color="brand.pastelBlue">
              today
            </Text>
          </Flex>
        </Flex>

        <Box w="1px" h="80px" bg="brand.darkBorder" />

        <Flex flexDirection="column" gap="4px">
          <Text fontSize="14px" fontWeight="300" color="brand.pastelBlue" m={0}>
            Volume (24h)
          </Text>
          <Text fontSize="32px" fontWeight="500" m={0} color="brand.pastelLavender">
            {volume}
          </Text>
        </Flex>

        <Flex flexDirection="column" gap="4px">
          <Text fontSize="14px" fontWeight="300" color="brand.pastelBlue" m={0}>
            Market Cap
          </Text>
          <Text fontSize="32px" fontWeight="500" m={0} color="brand.pastelMint">
            {marketCap}
          </Text>
        </Flex>
      </Flex>

      <Flex
        p="8px"
        borderRadius="12px"
        bgGradient="linear(135deg, brand.darkCard, #1F1F1F)"
        boxShadow="0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 brand.darkBorder"
        gap="8px"
      >
        {timeframes.map((tf) => (
          <Button
            key={tf}
            variant="timeframe"
            bg={timeframe === tf ? 'brand.pastelPink' : 'transparent'}
            color={timeframe === tf ? 'brand.darkBg' : 'brand.pastelBlue'}
            boxShadow={timeframe === tf ? '0 8px 25px rgba(248, 187, 217, 0.3)' : 'none'}
            transform={timeframe === tf ? 'translateY(-1px)' : 'none'}
            _hover={{
              bg: timeframe !== tf ? 'rgba(255,255,255,0.1)' : 'brand.pastelPink',
            }}
            onClick={() => setTimeframe(tf)}
          >
            {tf}
          </Button>
        ))}
      </Flex>
    </Flex>
  );
};

export default PriceSection; 