import React from 'react';
import { Box, Grid, Text } from '@chakra-ui/react';

const StatsGrid = ({ sentiment, marketDominance, totalSupply }) => {
  const formatLargeNumber = (value) => {
    if (!value) return 'N/A';
    const num =
      typeof value === 'string'
        ? parseFloat(value.replace(/[^0-9.-]+/g, ''))
        : value;

    if (num >= 1e6) {
      return `${(num / 1e6).toFixed(1)}M`;
    } else if (num >= 1e3) {
      return `${(num / 1e3).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const getSentimentStatus = (value) => {
    if (!value) return 'Unknown';
    if (value >= 80) return 'Very Bullish';
    if (value >= 60) return 'Bullish';
    if (value >= 40) return 'Neutral';
    if (value >= 20) return 'Bearish';
    return 'Very Bearish';
  };

  const getSentimentColor = (value) => {
    if (!value) return 'brand.pastelBlue';
    if (value >= 60) return 'brand.pastelMint';
    if (value >= 40) return 'brand.pastelYellow';
    return 'brand.pastelCoral';
  };

  const getDominanceStatus = (value) => {
    if (!value) return 'Unknown';
    if (value >= 50) return 'Dominant';
    if (value >= 40) return 'Strong';
    if (value >= 30) return 'Moderate';
    return 'Weak';
  };

  const getSupplyStatus = (totalSupply) => {
    if (!totalSupply || !totalSupply.percentage) return 'Unknown';
    const pct = parseFloat(totalSupply.percentage);
    if (pct >= 95) return 'Nearly Complete';
    if (pct >= 90) return 'Nearing End';
    if (pct >= 80) return 'Advanced';
    return 'In Progress';
  };

  const stats = [
    {
      label: 'Market Sentiment',
      value: sentiment ? sentiment.toFixed(0) : 'N/A',
      color: getSentimentColor(sentiment),
      status: getSentimentStatus(sentiment),
    },
    {
      label: 'Market Dominance',
      value: marketDominance ? `${marketDominance}%` : 'N/A',
      color: 'brand.pastelLavender',
      status: getDominanceStatus(parseFloat(marketDominance)),
    },
    {
      label: 'Supply Mined',
      value: totalSupply ? `${totalSupply.percentage}%` : 'N/A',
      color: 'brand.pastelMint',
      status: getSupplyStatus(totalSupply),
    },
    {
      label: 'Network Activity',
      value: '50.2%',
      color: 'brand.pastelCoral',
      status: 'Active',
    },
  ];

  return (
    <Grid templateColumns='repeat(4, 1fr)' gap='24px' mt='32px'>
      {stats.map((stat, index) => (
        <Box
          key={index}
          p='24px'
          borderRadius='12px'
          bgGradient='linear(135deg, brand.darkCard, #1F1F1F)'
          border='1px solid'
          borderColor='brand.darkBorder'
          boxShadow='0 8px 25px rgba(0,0,0,0.2)'
          transition='transform 0.3s ease'
          cursor='pointer'
          _hover={{
            transform: 'scale(1.05)',
          }}
        >
          <Text
            fontSize='14px'
            fontWeight='300'
            color='brand.pastelBlue'
            m='0 0 8px 0'
          >
            {stat.label}
          </Text>
          <Text
            fontSize='24px'
            fontWeight='bold'
            m='0 0 4px 0'
            color={stat.color}
          >
            {stat.value}
          </Text>
          <Text fontSize='12px' fontWeight='500' color='brand.pastelBlue' m={0}>
            {stat.status}
          </Text>
        </Box>
      ))}
    </Grid>
  );
};

export default StatsGrid;
