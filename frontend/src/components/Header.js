import React from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';

const Header = ({ blockHeight, lastUpdate, secondsSinceUpdate }) => {
  // Format time in UTC for consistency across YouTube stream viewers
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
    });
  };

  return (
    <Flex
      as='header'
      borderBottom='1px solid'
      borderColor='brand.darkBorder'
      bgGradient='linear(135deg, brand.darkCard, #1F1F1F)'
      p={{ base: '16px', md: '24px' }}
      direction={{ base: 'column', md: 'row' }}
      justifyContent='space-between'
      alignItems={{ base: 'flex-start', md: 'center' }}
      gap={{ base: '16px', md: '0' }}
    >
      <Flex alignItems='center' gap={{ base: '16px', md: '24px' }} wrap='wrap'>
        <Flex alignItems='center' gap='12px'>
          <Flex
            w={{ base: '40px', md: '48px' }}
            h={{ base: '40px', md: '48px' }}
            borderRadius='50%'
            bgGradient='linear(135deg, brand.pastelYellow, brand.pastelPeach)'
            color='brand.darkBg'
            fontWeight='bold'
            fontSize={{ base: '16px', md: '18px' }}
            alignItems='center'
            justifyContent='center'
            boxShadow='0 4px 15px rgba(0,0,0,0.3)'
          >
            ₿
          </Flex>
          <Text
            as='h1'
            fontSize={{ base: '20px', sm: '24px', md: '32px' }}
            fontWeight='300'
            bgGradient='linear(135deg, brand.pastelPink, brand.pastelLavender)'
            bgClip='text'
            m={0}
            whiteSpace='nowrap'
          >
            Bitcoin Dashboard
          </Text>
        </Flex>
        <Box
          w={{ base: '100%', md: '1px' }}
          h={{ base: '1px', md: '32px' }}
          bg='brand.darkBorder'
          display={{ base: 'block', md: 'block' }}
        />
        <Flex alignItems='center' gap='8px'>
          <Box
            w='12px'
            h='12px'
            borderRadius='50%'
            bg='brand.pastelCoral'
            animation='pulse 2s infinite'
          />
          <Text
            fontSize={{ base: '18px', md: '24px' }}
            fontWeight='500'
            color='brand.pastelCoral'
          >
            Live
          </Text>
        </Flex>
      </Flex>

      <Flex alignItems='center' gap='32px'>
        <Box textAlign={{ base: 'left', md: 'right' }}>
          <Text
            fontSize={{ base: '12px', md: '14px' }}
            fontWeight='300'
            color='brand.pastelBlue'
            m='0 0 4px 0'
          >
            Last Update (UTC)
          </Text>
          <Text
            fontSize={{ base: '16px', md: '20px' }}
            fontWeight='500'
            color='white'
            m={0}
          >
            {formatTime(lastUpdate)}
          </Text>
        </Box>
      </Flex>
    </Flex>
  );
};

export default Header;
