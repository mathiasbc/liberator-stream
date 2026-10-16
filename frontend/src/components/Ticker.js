import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Flex, Text } from '@chakra-ui/react';
import { palette, fonts } from '../theme/theme';
import { buildItems, dwellMs, momentItems } from '../utils/ticker';

// Segment highlight: true = the accent, 'up'/'down' = the move's colour
const segmentColor = (hi) => {
  if (hi === 'up') return palette.up;
  if (hi === 'down') return palette.down;
  return hi ? palette.accent : palette.ink;
};

// One fact at a time: slides in, holds for a few seconds, then the next.
// Nearly static between changes, which is kind to the encoder, and readable
// at any size, unlike a crawl. A fresh moment (a round number crossed, a
// new 24H high or low) jumps the queue.
const Ticker = ({ data, moments = [] }) => {
  const items = useMemo(
    () => [...momentItems(moments), ...buildItems(data)],
    [data, moments]
  );
  const [index, setIndex] = useState(0);

  const newest = moments.length ? moments[moments.length - 1].id : null;
  const shown = useRef(newest);
  useEffect(() => {
    if (newest && newest !== shown.current) {
      shown.current = newest;
      setIndex(0);
    }
  }, [newest]);

  const i = items.length ? index % items.length : 0;
  const segments = items[i] || [];
  const text = segments.map(([t]) => t).join(' ');
  const dwell = dwellMs(text);

  useEffect(() => {
    const id = setTimeout(
      () => setIndex((n) => (n + 1) % Math.max(1, items.length)),
      dwell
    );
    return () => clearTimeout(id);
  }, [i, dwell, items.length]);

  return (
    <Flex
      h='56px'
      flex='none'
      align='center'
      gap='16px'
      px='28px'
      bg={palette.deep}
      borderTop={`2px solid ${palette.accent}`}
      fontFamily={fonts.display}
      whiteSpace='nowrap'
      overflow='hidden'
    >
      <Text color={palette.live} fontSize='18px' flex='none'>
        ◆
      </Text>
      <Flex
        key={`${i}-${text}`}
        align='center'
        gap='10px'
        minW={0}
        animation='tickerIn 0.45s ease-out'
      >
        {segments.map(([t, hi], j) => (
          <Text
            key={j}
            fontSize='25px'
            fontWeight={hi ? '700' : '600'}
            letterSpacing='0.08em'
            color={segmentColor(hi)}
          >
            {t}
          </Text>
        ))}
      </Flex>
    </Flex>
  );
};

export default Ticker;
