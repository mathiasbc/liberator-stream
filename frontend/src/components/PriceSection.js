import React from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';

const PriceSection = ({
  currentPrice,
  priceChange,
  volume,
  marketCap,
  timeframe,
  marketDominance,
  totalSupply,
  extendedSupplyData,
  blockHeight,
}) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0, // Remove decimals for Bitcoin price
      maximumFractionDigits: 0, // Remove decimals for Bitcoin price
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

  const getAthDistanceColor = (percentage) => {
    if (!percentage) return 'brand.pastelBlue';
    const pct = Math.abs(parseFloat(percentage));
    if (pct <= 5) return 'brand.pastelMint';
    if (pct <= 15) return 'brand.pastelYellow';
    if (pct <= 30) return 'brand.pastelLavender';
    return 'brand.pastelCoral';
  };

  const MetricCard = ({ label, value, color }) => (
    <Flex
      flexDirection='column'
      gap='2px'
      alignItems='center'
      minW={{ base: '80px', md: '100px' }}
    >
      <Text
        fontSize={{ base: '11px', md: '13px', lg: '14px' }}
        fontWeight='300'
        color={color}
        m={0}
        opacity={0.8}
      >
        {label}
      </Text>
      <Text
        fontSize={{
          base: '16px',
          sm: '18px',
          md: '22px',
          lg: '24px',
          xl: '26px',
        }}
        fontWeight='500'
        m={0}
        color={color}
        whiteSpace='nowrap'
      >
        {value}
      </Text>
    </Flex>
  );

  return (
    <Box
      mb={{ base: '12px', md: '16px' }}
      p={{ base: '14px', md: '18px', lg: '20px' }}
      borderRadius={{ base: '12px', md: '16px' }}
      bgGradient='linear(135deg, brand.darkCard, #1A1A1A)'
      boxShadow='0 8px 32px rgba(0,0,0,0.4)'
      border='1px solid'
      borderColor='brand.darkBorder'
    >
      {/* Single Row Layout - Price + All Metrics */}
      <Flex
        direction={{ base: 'column', lg: 'row' }}
        justifyContent='space-between'
        alignItems={{ base: 'flex-start', lg: 'center' }}
        gap={{ base: '16px', lg: '32px' }}
      >
        {/* Price and Change */}
        <Flex flexDirection='column' gap='4px' minW='fit-content'>
          <Text
            as='h2'
            fontSize={{ base: '28px', sm: '36px', md: '48px', lg: '56px' }}
            fontWeight='600'
            color='#FFFF00'
            textShadow='0 4px 20px rgba(255, 255, 0, 0.6)'
            letterSpacing='-0.02em'
            m={0}
            lineHeight='1'
          >
            {formatPrice(currentPrice)}
          </Text>
          <Flex alignItems='center' gap='8px' wrap='wrap'>
            <Text
              fontSize={{ base: '16px', md: '18px' }}
              color={
                priceChange >= 0 ? 'brand.pastelMint' : 'brand.pastelCoral'
              }
            >
              {priceChange >= 0 ? '↗' : '↘'}
            </Text>
            <Text
              fontSize={{ base: '14px', md: '16px' }}
              fontWeight='500'
              color={
                priceChange >= 0 ? 'brand.pastelMint' : 'brand.pastelCoral'
              }
            >
              {priceChange >= 0 ? '+' : ''}
              {priceChange.toFixed(2)}%
            </Text>
            <Text
              fontSize={{ base: '14px', md: '16px' }}
              fontWeight='300'
              color='brand.pastelBlue'
            >
              today
            </Text>
          </Flex>
        </Flex>

        {/* All Metrics in Horizontal Layout */}
        <Flex
          gap={{ base: '12px', sm: '16px', md: '20px', lg: '24px' }}
          wrap='wrap'
          alignItems='center'
          justify={{ base: 'center', lg: 'flex-end' }}
          flex='1'
        >
          <MetricCard
            label='Volume (24h)'
            value={formatLargeNumber(volume)}
            color='brand.pastelLavender'
          />

          <MetricCard
            label='Market Cap'
            value={formatLargeNumber(marketCap)}
            color='brand.pastelMint'
          />

          <MetricCard
            label='Block Height'
            value={`#${blockHeight ? blockHeight.toLocaleString() : 'N/A'}`}
            color='brand.pastelBlue'
          />

          <MetricCard
            label='Distance from ATH'
            value={
              extendedSupplyData?.priceChangePercentageFromAth
                ? `${extendedSupplyData.priceChangePercentageFromAth}%`
                : 'N/A'
            }
            color={getAthDistanceColor(
              extendedSupplyData?.priceChangePercentageFromAth
            )}
          />

          <MetricCard
            label='Market Dominance'
            value={marketDominance ? `${marketDominance}%` : 'N/A'}
            color='brand.pastelPink'
          />

          <MetricCard
            label='Supply Mined'
            value={totalSupply ? `${totalSupply.percentage}%` : 'N/A'}
            color='brand.pastelCoral'
          />
        </Flex>
      </Flex>
    </Box>
  );
};

export default PriceSection;
