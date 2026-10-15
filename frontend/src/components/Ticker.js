import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { palette, fonts } from '../theme/theme';
import { buildItems } from '../utils/ticker';

// Crawl speed in px/s; slow enough to read on a phone
const SPEED = 85;

const Ticker = ({ data }) => {
  const items = useMemo(() => buildItems(data), [data]);
  const trackRef = useRef();
  const [duration, setDuration] = useState(null);

  // Size the loop to the content so the crawl speed stays constant. Only
  // re-time on big width changes; nudging the duration makes the crawl jump.
  useLayoutEffect(() => {
    const half = (trackRef.current?.scrollWidth || 0) / 2;
    const next = Math.max(30, half / SPEED);
    setDuration((d) => (d && Math.abs(next - d) / d < 0.15 ? d : next));
  }, [items]);

  return (
    <Flex
      h='56px'
      flex='none'
      bg={palette.deep}
      borderTop={`2px solid ${palette.accent}`}
      fontFamily={fonts.display}
      overflow='hidden'
    >
      <Box flex='1' overflow='hidden' display='flex' alignItems='center'>
        <Flex
          ref={trackRef}
          w='max-content'
          whiteSpace='nowrap'
          animation={
            duration ? `marquee ${duration}s linear infinite` : undefined
          }
        >
          {[...items, ...items].map((segments, i) => (
            <Flex key={i} align='center' gap='10px' pl='28px'>
              {segments.map(([text, hi], j) => (
                <Text
                  key={j}
                  fontSize='24px'
                  fontWeight={hi ? '700' : '600'}
                  letterSpacing='0.08em'
                  color={hi ? palette.accent : palette.ink}
                >
                  {text}
                </Text>
              ))}
              <Text color={palette.live} fontSize='15px' pl='26px'>
                ◆
              </Text>
            </Flex>
          ))}
        </Flex>
      </Box>
    </Flex>
  );
};

export default Ticker;
