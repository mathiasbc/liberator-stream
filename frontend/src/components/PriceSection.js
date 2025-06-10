import React from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';

const PriceSection = ({
  currentPrice,
  priceChange,
  volume,
  marketCap,
  timeframe,
}) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  const formatLargeNumber = (value) => {
    const num =
      typeof value === 'string'
        ? parseFloat(value.replace(/[^0-9.-]+/g, ''))
        : value;

    if (num >= 1e12) {
      return `$${(num / 1e12).toFixed(2)}T`;
    } else if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    }
    return `$${num.toLocaleString()}`;
  };

  // Static list of all timeframes
  const timeframes = ['5M', '1H', '4H', '1D', '1W'];

  return (
    <Flex mb='32px' justifyContent='space-between' alignItems='center'>
      <Flex alignItems='center' gap='48px'>
        <Flex flexDirection='column' gap='8px'>
          <Text
            as='h2'
            fontSize='64px'
            fontWeight='300'
            color='brand.pastelYellow'
            m={0}
          >
            {formatPrice(currentPrice)}
          </Text>
          <Flex alignItems='center' gap='12px'>
            <Text
              fontSize='24px'
              color={
                priceChange >= 0 ? 'brand.pastelMint' : 'brand.pastelCoral'
              }
            >
              {priceChange >= 0 ? '↗' : '↘'}
            </Text>
            <Text
              fontSize='20px'
              fontWeight='500'
              color={
                priceChange >= 0 ? 'brand.pastelMint' : 'brand.pastelCoral'
              }
            >
              {priceChange >= 0 ? '+' : ''}
              {priceChange.toFixed(2)}%
            </Text>
            <Text fontSize='20px' fontWeight='300' color='brand.pastelBlue'>
              today
            </Text>
          </Flex>
        </Flex>

        <Box w='1px' h='80px' bg='brand.darkBorder' />

        <Flex flexDirection='column' gap='4px'>
          <Text
            fontSize='14px'
            fontWeight='300'
            color='brand.pastelLavender'
            m={0}
          >
            Volume (24h)
          </Text>
          <Text
            fontSize='32px'
            fontWeight='500'
            m={0}
            color='brand.pastelLavender'
          >
            {formatLargeNumber(volume)}
          </Text>
        </Flex>

        <Flex flexDirection='column' gap='4px'>
          <Text fontSize='14px' fontWeight='300' color='brand.pastelMint' m={0}>
            Market Cap
          </Text>
          <Text fontSize='32px' fontWeight='500' m={0} color='brand.pastelMint'>
            {formatLargeNumber(marketCap)}
          </Text>
        </Flex>
      </Flex>

      <Flex
        p='16px 24px'
        borderRadius='12px'
        bgGradient='linear(135deg, brand.darkCard, #1F1F1F)'
        boxShadow='0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 brand.darkBorder'
        alignItems='center'
        gap='12px'
        flexDirection='column'
      >
        <Text fontSize='14px' fontWeight='300' color='brand.pastelBlue'>
          Auto-rotating timeframes:
        </Text>
        <Flex alignItems='center' gap='8px'>
          {timeframes.map((item, index) => (
            <React.Fragment key={item}>
              <Box
                px='12px'
                py='6px'
                borderRadius='8px'
                bg={item === timeframe ? 'brand.pastelPink' : 'transparent'}
                color={item === timeframe ? 'brand.darkBg' : 'brand.pastelBlue'}
                fontSize='14px'
                fontWeight={item === timeframe ? '600' : '400'}
                border={item !== timeframe ? '1px solid' : 'none'}
                borderColor={
                  item !== timeframe ? 'brand.darkBorder' : 'transparent'
                }
                boxShadow={
                  item === timeframe
                    ? '0 4px 15px rgba(248, 187, 217, 0.3)'
                    : 'none'
                }
                transition='all 0.3s ease'
              >
                {item}
              </Box>
              {index < timeframes.length - 1 && (
                <Text fontSize='12px' color='brand.pastelLavender'>
                  →
                </Text>
              )}
            </React.Fragment>
          ))}
        </Flex>
      </Flex>
    </Flex>
  );
};

export default PriceSection;
