import React from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import useNow from '../hooks/useNow';
import { palette, fonts } from '../theme/theme';

const CITIES = [
  ['NYC', 'America/New_York'],
  ['LDN', 'Europe/London'],
  ['TKY', 'Asia/Tokyo'],
];
const cityFormatters = CITIES.map(([label, timeZone]) => [
  label,
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }),
]);

// The live stream moves the market every second and the REST fallback every
// 30s; only call it out once we're well past both
const DELAYED_AFTER_S = 45;

const statusFor = (connected, seconds) => {
  if (!connected) return { label: 'RECONNECTING', bg: '#5A6280', pulse: false };
  if (seconds !== null && seconds >= DELAYED_AFTER_S) {
    return { label: `DELAYED · ${seconds}S`, bg: palette.sats, pulse: false };
  }
  return { label: 'LIVE', bg: palette.live, pulse: true };
};

const OnAirBar = ({ lastMarketAt, connected }) => {
  const now = useNow(1000);
  const seconds = lastMarketAt
    ? Math.max(0, Math.floor((now - lastMarketAt) / 1000))
    : null;
  const status = statusFor(connected, seconds);
  const utc = new Date(now).toISOString().slice(11, 19);

  return (
    <Flex
      h='52px'
      align='stretch'
      bg={palette.deep}
      borderBottom={`1px solid ${palette.line}`}
      fontFamily={fonts.display}
      position='relative'
      zIndex={2}
    >
      <Flex
        align='center'
        gap='12px'
        pl='28px'
        pr='40px'
        bg={status.bg}
        transition='background 0.4s ease'
        clipPath='polygon(0 0, 100% 0, calc(100% - 18px) 100%, 0 100%)'
      >
        <Box
          w='12px'
          h='12px'
          borderRadius='50%'
          bg='#fff'
          animation={status.pulse ? 'pulse 1.4s ease-in-out infinite' : 'none'}
        />
        <Text
          fontSize='27px'
          fontWeight='800'
          letterSpacing='0.16em'
          color='#fff'
          lineHeight='1'
        >
          {status.label}
        </Text>
      </Flex>

      <Flex align='center' pl='22px' gap='14px' whiteSpace='nowrap'>
        <Text
          fontSize='23px'
          fontWeight='600'
          letterSpacing='0.2em'
          color={palette.mute}
        >
          BITCOIN, AROUND THE CLOCK
        </Text>
      </Flex>

      <Box flex='1' />

      <Flex align='center' gap='18px' pr='26px'>
        {cityFormatters.map(([label, fmt]) => (
          <Flex key={label} align='baseline' gap='8px'>
            <Text
              fontSize='18px'
              fontWeight='600'
              letterSpacing='0.16em'
              color={palette.dim}
            >
              {label}
            </Text>
            <Text
              fontFamily={fonts.mono}
              fontSize='20px'
              fontWeight='600'
              color={palette.mute}
            >
              {fmt.format(now)}
            </Text>
          </Flex>
        ))}
      </Flex>

      <Flex
        align='center'
        gap='10px'
        px='26px'
        bg={palette.card}
        borderLeft={`1px solid ${palette.line}`}
      >
        <Text
          fontFamily={fonts.mono}
          fontSize='22px'
          fontWeight='700'
          color={palette.ink}
        >
          {utc}
        </Text>
        <Text
          fontSize='18px'
          fontWeight='700'
          letterSpacing='0.16em'
          color={palette.accent}
        >
          UTC
        </Text>
      </Flex>
    </Flex>
  );
};

export default OnAirBar;
