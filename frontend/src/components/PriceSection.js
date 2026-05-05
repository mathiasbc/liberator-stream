import React from 'react';
import { Box, Flex, Grid, Image, Link, Text, useTheme } from '@chakra-ui/react';

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

const ROW_PRICE = 'brand.pastelMint';
const ROW_NETWORK = 'brand.pastelBlue';

const Metric = ({ label, value, color }) => (
  <Flex flexDirection='column' gap='3px' minW={0} alignItems='flex-start'>
    <Text
      fontSize={{ base: '11px', md: '12px', lg: '13px', xl: '14px' }}
      fontWeight='500'
      color='rgba(255,255,255,0.6)'
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
        base: '16px',
        md: '18px',
        lg: '20px',
        xl: '22px',
        '2xl': '26px',
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
  const { colors } = useTheme();
  const change = priceChange || 0;
  const positive = change >= 0;
  const fmtCandle = (v) => (v == null || v === 0 ? 'N/A' : formatPrice(v));
  const heroColor = colors?.brand?.priceHero || '#FFD60A';
  const heroGlow = colors?.brand?.priceHeroGlow || 'rgba(255, 214, 10, 0.45)';

  return (
    <Box
      mb={{ base: '10px', md: '12px', xl: '14px' }}
      p={{ base: '14px', md: '18px', lg: '20px', xl: '24px' }}
      borderRadius={{ base: '12px', md: '14px' }}
      bgGradient='linear(135deg, brand.darkCard, #1A1A1A)'
      boxShadow='0 8px 32px rgba(0,0,0,0.4)'
      border='1px solid'
      borderColor='brand.darkBorder'
    >
      <Grid
        templateColumns={{
          base: '1fr',
          xl: 'auto auto 1fr',
        }}
        gap={{ base: '16px', xl: '28px', '2xl': '40px' }}
        alignItems='center'
      >
        {/* Liberator logo */}
        <Link
          href='https://github.com/mathiasbc/liberator-stream'
          isExternal
          _hover={{ opacity: 0.85 }}
          transition='opacity 0.2s ease'
          display='flex'
          alignItems='center'
          justifyContent='center'
        >
          <Image
            src='/assets/the_liberator_horizontal.png'
            alt='The Liberator'
            h={{
              base: '64px',
              md: '80px',
              lg: '96px',
              xl: '110px',
              '2xl': '130px',
            }}
            w='auto'
            objectFit='contain'
          />
        </Link>

        {/* Price column */}
        <Flex flexDirection='column' gap='10px' minW='fit-content'>
          {/* Price */}
          <Text
            as='h2'
            fontSize={{
              base: '36px',
              sm: '44px',
              md: '54px',
              lg: '64px',
              xl: '76px',
              '2xl': '92px',
            }}
            fontWeight='700'
            color={heroColor}
            textShadow={`0 4px 24px ${heroGlow}`}
            letterSpacing='-0.03em'
            m={0}
            lineHeight='0.95'
            fontFamily='monospace'
          >
            {formatPrice(currentPrice)}
          </Text>

          {/* Change */}
          <Flex alignItems='center' gap='10px' wrap='wrap'>
            <Text
              fontSize={{ base: '16px', md: '20px', xl: '24px' }}
              color={positive ? 'brand.pastelMint' : 'brand.pastelCoral'}
            >
              {positive ? '↗' : '↘'}
            </Text>
            <Text
              fontSize={{ base: '14px', md: '18px', xl: '22px' }}
              fontWeight='600'
              color={positive ? 'brand.pastelMint' : 'brand.pastelCoral'}
              fontFamily='monospace'
            >
              {positive ? '+' : ''}
              {change.toFixed(2)}%
            </Text>
            <Text
              fontSize={{ base: '12px', md: '14px', xl: '16px' }}
              fontWeight='300'
              color='brand.pastelBlue'
            >
              24h
            </Text>
          </Flex>
        </Flex>

        {/* Metrics — right-aligned */}
        <Grid
          templateColumns={{
            base: 'repeat(2, max-content)',
            sm: 'repeat(3, max-content)',
            lg: 'repeat(5, max-content)',
          }}
          justifyContent={{ base: 'flex-start', xl: 'flex-end' }}
          rowGap={{ base: '12px', md: '14px', xl: '16px' }}
          columnGap={{
            base: '20px',
            md: '32px',
            lg: '40px',
            xl: '48px',
            '2xl': '64px',
          }}
        >
          {/* Row 1 — daily price action (yellow) */}
          <Metric
            label='Daily Open'
            value={fmtCandle(dayOpen)}
            color={ROW_PRICE}
          />
          <Metric
            label='Daily High'
            value={fmtCandle(dayHigh)}
            color={ROW_PRICE}
          />
          <Metric
            label='Daily Low'
            value={fmtCandle(dayLow)}
            color={ROW_PRICE}
          />
          <Metric
            label='Daily Close'
            value={fmtCandle(dayClose)}
            color={ROW_PRICE}
          />
          <Metric
            label='Volume 24h'
            value={formatLargeNumber(volume)}
            color={ROW_PRICE}
          />

          {/* Row 2 — market & network (blue) */}
          <Metric
            label='Market Cap'
            value={formatLargeNumber(marketCap)}
            color={ROW_NETWORK}
          />
          <Metric
            label='Block Height'
            value={blockHeight ? `#${blockHeight.toLocaleString()}` : 'N/A'}
            color={ROW_NETWORK}
          />
          <Metric
            label='Distance from ATH'
            value={
              extendedSupplyData?.priceChangePercentageFromAth
                ? `${extendedSupplyData.priceChangePercentageFromAth}%`
                : 'N/A'
            }
            color={ROW_NETWORK}
          />
          <Metric
            label='Market Dominance'
            value={marketDominance ? `${marketDominance}%` : 'N/A'}
            color={ROW_NETWORK}
          />
          <Metric
            label='Supply Mined'
            value={
              totalSupply?.percentage ? `${totalSupply.percentage}%` : 'N/A'
            }
            color={ROW_NETWORK}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default PriceSection;
