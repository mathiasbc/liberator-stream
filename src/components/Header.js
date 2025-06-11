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
      p='24px'
      justifyContent='space-between'
      alignItems='center'
    >
      <Flex alignItems='center' gap='24px'>
        <Flex alignItems='center' gap='12px'>
          <Flex
            w='48px'
            h='48px'
            borderRadius='50%'
            bgGradient='linear(135deg, brand.pastelYellow, brand.pastelPeach)'
            color='brand.darkBg'
            fontWeight='bold'
            fontSize='18px'
            alignItems='center'
            justifyContent='center'
            boxShadow='0 4px 15px rgba(0,0,0,0.3)'
          >
            ₿
          </Flex>
          <Text
            as='h1'
            fontSize='32px'
            fontWeight='300'
            bgGradient='linear(135deg, brand.pastelPink, brand.pastelLavender)'
            bgClip='text'
            m={0}
          >
            Bitcoin Dashboard
          </Text>
        </Flex>
        <Box w='1px' h='32px' bg='brand.darkBorder' />
        <Flex alignItems='center' gap='8px'>
          <Box
            w='12px'
            h='12px'
            borderRadius='50%'
            bg='brand.pastelCoral'
            animation='pulse 2s infinite'
          />
          <Text fontSize='24px' fontWeight='500' color='brand.pastelCoral'>
            Live
          </Text>
        </Flex>
      </Flex>

      <Flex alignItems='center' gap='32px'>
        <Box textAlign='right'>
          <Text
            fontSize='14px'
            fontWeight='300'
            color='brand.pastelBlue'
            m='0 0 4px 0'
          >
            Last Update (UTC)
          </Text>
          <Text fontSize='20px' fontWeight='500' color='white' m={0}>
            {formatTime(lastUpdate)}
          </Text>
        </Box>
      </Flex>
    </Flex>
  );
};

export default Header;
