import React from 'react';
import { Box, Flex, Image, Link, Text } from '@chakra-ui/react';

const Header = ({ secondsSinceUpdate }) => {
  const freshnessColor =
    secondsSinceUpdate <= 30
      ? 'brand.pastelMint'
      : secondsSinceUpdate <= 90
        ? 'brand.pastelYellow'
        : 'brand.pastelCoral';

  return (
    <Flex
      as='header'
      borderBottom='1px solid'
      borderColor='brand.darkBorder'
      bgGradient='linear(135deg, brand.darkCard, #1F1F1F)'
      px={{ base: '16px', md: '24px', xl: '32px' }}
      py={{ base: '12px', md: '14px', xl: '18px' }}
      direction='row'
      justifyContent='space-between'
      alignItems='center'
      gap='16px'
    >
      <Flex alignItems='center' gap={{ base: '16px', md: '24px', xl: '32px' }}>
        <Link
          href='https://github.com/mathiasbc/liberator-stream'
          isExternal
          _hover={{ opacity: 0.85 }}
          transition='opacity 0.2s ease'
          display='flex'
          alignItems='center'
        >
          <Image
            src='/assets/the_liberator_horizontal.png'
            alt='The Liberator'
            h={{ base: '56px', md: '80px', xl: '110px', '2xl': '130px' }}
            w='auto'
            objectFit='contain'
          />
        </Link>

        <Flex alignItems='center' gap={{ base: '10px', md: '12px' }}>
          <Box
            w={{ base: '14px', md: '16px', xl: '18px' }}
            h={{ base: '14px', md: '16px', xl: '18px' }}
            borderRadius='50%'
            bg={freshnessColor}
            boxShadow={`0 0 16px ${freshnessColor === 'brand.pastelMint' ? 'rgba(127,223,184,0.6)' : freshnessColor === 'brand.pastelYellow' ? 'rgba(255,213,79,0.6)' : 'rgba(255,122,133,0.6)'}`}
            animation='pulse 2s infinite'
          />
          <Text
            fontSize={{ base: '20px', md: '26px', xl: '32px' }}
            fontWeight='600'
            color={freshnessColor}
            letterSpacing='0.02em'
          >
            Live
          </Text>
        </Flex>
      </Flex>

      <Box textAlign='right'>
        <Text
          fontSize={{ base: '12px', md: '13px', xl: '15px' }}
          fontWeight='300'
          color='brand.pastelBlue'
          m='0 0 2px 0'
          letterSpacing='0.04em'
          textTransform='uppercase'
        >
          Refreshed
        </Text>
        <Text
          fontSize={{ base: '20px', md: '26px', xl: '32px' }}
          fontWeight='500'
          color={freshnessColor}
          fontFamily='monospace'
          m={0}
          lineHeight='1'
        >
          {secondsSinceUpdate}s ago
        </Text>
      </Box>
    </Flex>
  );
};

export default Header;
