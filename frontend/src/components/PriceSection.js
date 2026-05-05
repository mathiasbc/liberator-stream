import React from 'react';
import { Box, Flex, Grid, Text } from '@chakra-ui/react';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price || 0);

const formatLargeNumber = (value) => {
  const num =
    typeof value === 'string'
      ? parseFloat(value.replace(/[^0-9.-]+/g, ''))
      : value;
  if (!isFinite(num)) return 'N/A';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
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

const Metric = ({ label, value, color }) => (
  <Flex flexDirection='column' gap='4px' minW={0} alignItems='flex-start'>
    <Text
      fontSize={{ base: '12px', md: '13px', lg: '14px', xl: '16px' }}
      fontWeight='500'
      color='rgba(255,255,255,0.65)'
      m={0}
      letterSpacing='0.06em'
      textTransform='uppercase'
      lineHeight='1.1'
      whiteSpace='nowrap'
    >
      {label}
    </Text>
    <Text
      fontSize={{
        base: '18px',
        md: '22px',
        lg: '26px',
        xl: '30px',
        '2xl': '34px',
      }}
      fontWeight='600'
      m={0}
      color={color}
      whiteSpace='nowrap'
      fontFamily='monospace'
      lineHeight='1.05'
      letterSpacing='-0.01em'
    >
      {value}
    </Text>
  </Flex>
);

const PriceSection = ({
  currentPrice,
  priceChange,
  volume,
  marketCap,
  marketDominance,
  totalSupply,
  extendedSupplyData,
  blockHeight,
  dayOpen,
  dayHigh,
  dayLow,
  dayClose,
}) => {
  const change = priceChange || 0;
  const positive = change >= 0;
  const fmtCandle = (v) => (v == null || v === 0 ? 'N/A' : formatPrice(v));

  return (
    <Box
      mb={{ base: '12px', md: '16px', xl: '20px' }}
      p={{ base: '16px', md: '24px', lg: '28px', xl: '36px' }}
      borderRadius={{ base: '12px', md: '16px' }}
      bgGradient='linear(135deg, brand.darkCard, #1A1A1A)'
      boxShadow='0 8px 32px rgba(0,0,0,0.4)'
      border='1px solid'
      borderColor='brand.darkBorder'
    >
      <Grid
        templateColumns={{
          base: '1fr',
          xl: 'auto 1fr',
        }}
        gap={{ base: '20px', xl: '40px', '2xl': '56px' }}
        alignItems='center'
      >
        {/* Hero price */}
        <Flex flexDirection='column' gap='10px' minW='fit-content'>
          <Text
            as='h2'
            fontSize={{
              base: '40px',
              sm: '52px',
              md: '70px',
              lg: '88px',
              xl: '108px',
              '2xl': '132px',
            }}
            fontWeight='700'
            color='#FFFF00'
            textShadow='0 4px 28px rgba(255, 255, 0, 0.45)'
            letterSpacing='-0.03em'
            m={0}
            lineHeight='0.95'
            fontFamily='monospace'
          >
            {formatPrice(currentPrice)}
          </Text>
          <Flex alignItems='center' gap='12px' wrap='wrap'>
            <Text
              fontSize={{ base: '20px', md: '26px', xl: '34px' }}
              color={positive ? 'brand.pastelMint' : 'brand.pastelCoral'}
            >
              {positive ? '↗' : '↘'}
            </Text>
            <Text
              fontSize={{ base: '18px', md: '22px', xl: '30px' }}
              fontWeight='600'
              color={positive ? 'brand.pastelMint' : 'brand.pastelCoral'}
              fontFamily='monospace'
            >
              {positive ? '+' : ''}
              {change.toFixed(2)}%
            </Text>
            <Text
              fontSize={{ base: '14px', md: '18px', xl: '22px' }}
              fontWeight='300'
              color='brand.pastelBlue'
            >
              24h
            </Text>
          </Flex>
        </Flex>

        {/* Metrics — borderless dense grid, right-aligned */}
        <Grid
          templateColumns={{
            base: 'repeat(2, max-content)',
            sm: 'repeat(3, max-content)',
            lg: 'repeat(5, max-content)',
          }}
          justifyContent={{ base: 'flex-start', xl: 'flex-end' }}
          rowGap={{ base: '16px', md: '20px', xl: '24px' }}
          columnGap={{
            base: '28px',
            md: '48px',
            lg: '64px',
            xl: '80px',
            '2xl': '100px',
          }}
        >
          <Metric
            label='Daily Open'
            value={fmtCandle(dayOpen)}
            color='brand.pastelYellow'
          />
          <Metric
            label='Daily High'
            value={fmtCandle(dayHigh)}
            color='brand.pastelMint'
          />
          <Metric
            label='Daily Low'
            value={fmtCandle(dayLow)}
            color='brand.pastelCoral'
          />
          <Metric
            label='Daily Close'
            value={fmtCandle(dayClose)}
            color='brand.pastelYellow'
          />
          <Metric
            label='Volume 24h'
            value={formatLargeNumber(volume)}
            color='brand.pastelLavender'
          />
          <Metric
            label='Market Cap'
            value={formatLargeNumber(marketCap)}
            color='brand.pastelMint'
          />
          <Metric
            label='Block Height'
            value={blockHeight ? `#${blockHeight.toLocaleString()}` : 'N/A'}
            color='brand.pastelBlue'
          />
          <Metric
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
          <Metric
            label='Market Dominance'
            value={marketDominance ? `${marketDominance}%` : 'N/A'}
            color='brand.pastelPink'
          />
          <Metric
            label='Supply Mined'
            value={
              totalSupply?.percentage ? `${totalSupply.percentage}%` : 'N/A'
            }
            color='brand.pastelCoral'
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default PriceSection;
