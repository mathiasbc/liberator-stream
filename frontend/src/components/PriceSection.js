import React from 'react';
import { Box, Flex, Text, Grid, GridItem } from '@chakra-ui/react';

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

  // Static list of all timeframes
  const timeframes = ['5M', '1H', '4H', '1D', '1W'];

  const MetricCard = ({ label, value, color }) => (
    <Flex flexDirection='column' gap='4px' minW={{ base: '120px', md: 'auto' }}>
      <Text
        fontSize={{ base: '12px', md: '14px' }}
        fontWeight='300'
        color={color}
        m={0}
      >
        {label}
      </Text>
      <Text
        fontSize={{ base: '18px', sm: '22px', md: '28px', lg: '32px' }}
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
    <Box mb='32px'>
      {/* Main Price Section */}
      <Flex
        direction={{ base: 'column', lg: 'row' }}
        justifyContent='space-between'
        alignItems={{ base: 'flex-start', lg: 'center' }}
        gap={{ base: '24px', lg: '48px' }}
        mb={{ base: '24px', md: '32px' }}
      >
        {/* Price and Change */}
        <Flex flexDirection='column' gap='8px' flex='1'>
          <Text
            as='h2'
            fontSize={{ base: '36px', sm: '48px', md: '64px', lg: '76px' }}
            fontWeight='600'
            color='brand.bitcoinOrange'
            textShadow='0 4px 20px rgba(247, 147, 26, 0.4)'
            letterSpacing='-0.02em'
            m={0}
            lineHeight='1'
          >
            {formatPrice(currentPrice)}
          </Text>
          <Flex alignItems='center' gap='12px' wrap='wrap'>
            <Text
              fontSize={{ base: '18px', md: '24px' }}
              color={
                priceChange >= 0 ? 'brand.pastelMint' : 'brand.pastelCoral'
              }
            >
              {priceChange >= 0 ? '↗' : '↘'}
            </Text>
            <Text
              fontSize={{ base: '16px', md: '20px' }}
              fontWeight='500'
              color={
                priceChange >= 0 ? 'brand.pastelMint' : 'brand.pastelCoral'
              }
            >
              {priceChange >= 0 ? '+' : ''}
              {priceChange.toFixed(2)}%
            </Text>
            <Text
              fontSize={{ base: '16px', md: '20px' }}
              fontWeight='300'
              color='brand.pastelBlue'
            >
              today
            </Text>
          </Flex>
        </Flex>

        {/* Timeframe Indicator */}
        <Flex
          p={{ base: '12px 16px', md: '16px 24px' }}
          borderRadius='12px'
          bgGradient='linear(135deg, brand.darkCard, #1F1F1F)'
          boxShadow='0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 brand.darkBorder'
          alignItems='center'
          gap='12px'
          flexDirection='column'
          minW='fit-content'
        >
          <Text
            fontSize={{ base: '12px', md: '14px' }}
            fontWeight='300'
            color='brand.pastelBlue'
          >
            Auto-rotating timeframes:
          </Text>
          <Flex alignItems='center' gap='8px' wrap='wrap' justify='center'>
            {timeframes.map((item, index) => (
              <React.Fragment key={item}>
                <Box
                  p={{ base: '4px 8px', md: '6px 12px' }}
                  borderRadius='6px'
                  bg={
                    item === timeframe
                      ? 'brand.pastelPink'
                      : 'rgba(255, 255, 255, 0.1)'
                  }
                  color={
                    item === timeframe ? 'brand.darkBg' : 'brand.pastelBlue'
                  }
                  fontSize={{ base: '12px', md: '14px' }}
                  fontWeight={item === timeframe ? '600' : '400'}
                  transition='all 0.3s ease'
                  boxShadow={
                    item === timeframe
                      ? '0 0 15px rgba(245, 101, 101, 0.4)'
                      : 'none'
                  }
                >
                  {item}
                </Box>
                {index < timeframes.length - 1 && (
                  <Box
                    w='4px'
                    h='4px'
                    borderRadius='50%'
                    bg='brand.darkBorder'
                  />
                )}
              </React.Fragment>
            ))}
          </Flex>
        </Flex>
      </Flex>

      {/* Metrics Grid */}
      <Grid
        templateColumns={{
          base: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(6, 1fr)',
        }}
        gap={{ base: '16px', md: '24px', lg: '32px' }}
        p={{ base: '16px', md: '20px', lg: '24px' }}
        borderRadius='16px'
        bgGradient='linear(135deg, brand.darkCard, #1A1A1A)'
        boxShadow='0 8px 32px rgba(0,0,0,0.4)'
        border='1px solid'
        borderColor='brand.darkBorder'
      >
        <GridItem>
          <MetricCard
            label='Volume (24h)'
            value={formatLargeNumber(volume)}
            color='brand.pastelLavender'
          />
        </GridItem>

        <GridItem>
          <MetricCard
            label='Market Cap'
            value={formatLargeNumber(marketCap)}
            color='brand.pastelMint'
          />
        </GridItem>

        <GridItem>
          <MetricCard
            label='Block Height'
            value={`#${blockHeight ? blockHeight.toLocaleString() : 'N/A'}`}
            color='brand.pastelBlue'
          />
        </GridItem>

        <GridItem>
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
        </GridItem>

        <GridItem>
          <MetricCard
            label='Market Dominance'
            value={marketDominance ? `${marketDominance}%` : 'N/A'}
            color='brand.pastelPink'
          />
        </GridItem>

        <GridItem>
          <MetricCard
            label='Supply Mined'
            value={totalSupply ? `${totalSupply.percentage}%` : 'N/A'}
            color='brand.pastelCoral'
          />
        </GridItem>
      </Grid>
    </Box>
  );
};

export default PriceSection;
