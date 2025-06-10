import React from 'react';
import { Box, Grid, Text } from '@chakra-ui/react';

const StatsGrid = () => {
  const stats = [
    { 
      label: 'Market Sentiment', 
      value: '72', 
      color: 'brand.pastelYellow', 
      status: 'Optimistic' 
    },
    { 
      label: 'Network Activity', 
      value: '51.2%', 
      color: 'brand.pastelCoral', 
      status: 'Active' 
    },
    { 
      label: 'Daily Addresses', 
      value: '1.1M', 
      color: 'brand.pastelMint', 
      status: 'Growing' 
    },
    { 
      label: 'Hash Power', 
      value: '521 EH/s', 
      color: 'brand.pastelLavender', 
      status: 'Strong' 
    },
  ];

  return (
    <Grid templateColumns="repeat(4, 1fr)" gap="24px" mt="32px">
      {stats.map((stat, index) => (
        <Box
          key={index}
          p="24px"
          borderRadius="12px"
          bgGradient="linear(135deg, brand.darkCard, #1F1F1F)"
          border="1px solid"
          borderColor="brand.darkBorder"
          boxShadow="0 8px 25px rgba(0,0,0,0.2)"
          transition="transform 0.3s ease"
          cursor="pointer"
          _hover={{
            transform: 'scale(1.05)',
          }}
        >
          <Text 
            fontSize="14px" 
            fontWeight="300" 
            color="brand.pastelBlue" 
            m="0 0 8px 0"
          >
            {stat.label}
          </Text>
          <Text 
            fontSize="24px" 
            fontWeight="bold" 
            m="0 0 4px 0"
            color={stat.color}
          >
            {stat.value}
          </Text>
          <Text 
            fontSize="12px" 
            fontWeight="500" 
            color="brand.pastelBlue" 
            m={0}
          >
            {stat.status}
          </Text>
        </Box>
      ))}
    </Grid>
  );
};

export default StatsGrid; 