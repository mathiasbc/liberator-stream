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
      p={{ base: '12px', md: '16px' }}
      direction={{ base: 'column', md: 'row' }}
      justifyContent='space-between'
      alignItems={{ base: 'flex-start', md: 'center' }}
      gap={{ base: '12px', md: '0' }}
      minH={{ base: 'auto', md: '60px' }}
    >
      <Flex alignItems='center' gap={{ base: '12px', md: '16px' }} wrap='wrap'>
        <Flex alignItems='center' gap='8px'>
          <Flex
            w={{ base: '32px', md: '40px' }}
            h={{ base: '32px', md: '40px' }}
            borderRadius='50%'
            bgGradient='linear(135deg, brand.pastelYellow, brand.pastelPeach)'
            color='brand.darkBg'
            fontWeight='bold'
            fontSize={{ base: '14px', md: '16px' }}
            alignItems='center'
            justifyContent='center'
            boxShadow='0 4px 15px rgba(0,0,0,0.3)'
          >
            ₿
          </Flex>
          <Text
            as='h1'
            fontSize={{ base: '18px', sm: '20px', md: '24px' }}
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
          h={{ base: '1px', md: '24px' }}
          bg='brand.darkBorder'
          display={{ base: 'block', md: 'block' }}
        />
        <Flex alignItems='center' gap='6px'>
          <Box
            w='10px'
            h='10px'
            borderRadius='50%'
            bg='brand.pastelCoral'
            animation='pulse 2s infinite'
          />
          <Text
            fontSize={{ base: '16px', md: '18px' }}
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
            fontSize={{ base: '11px', md: '13px', lg: '14px' }}
            fontWeight='300'
            color='brand.pastelBlue'
            m='0 0 2px 0'
          >
            Last Update (UTC)
          </Text>
          <Text
            fontSize={{ base: '16px', md: '20px', lg: '22px', xl: '24px' }}
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
