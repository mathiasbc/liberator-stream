import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { palette, fonts } from '../theme/theme';
import {
  formatDate,
  formatInt,
  formatPct,
  formatUsd,
  toNumber,
} from '../utils/format';
import { blockSubsidy } from '../utils/metrics';

// Crawl speed in px/s; slow enough to read on a phone
const SPEED = 85;

const formatBlockTime = (seconds) =>
  `${Math.floor(seconds / 60)}M ${String(Math.round(seconds % 60)).padStart(2, '0')}S`;

// Each item is a list of [text, highlighted?] segments. The crawl only
// carries facts that aren't already on screen: ATH, halving, difficulty,
// supply, fees, mempool and market cap all live in the panels above.
const buildItems = (data) => {
  const items = [];
  const ext = data.extendedSupplyData || {};
  const global = data.globalMarketData || {};
  const net = data.networkData || {};

  const atl = toNumber(ext.atlPrice);
  if (atl) {
    const since = data.currentPrice
      ? (data.currentPrice / atl - 1) * 100
      : null;
    items.push([
      ['ALL-TIME LOW'],
      [formatUsd(atl, 2), true],
      [`· ${formatDate(new Date(ext.atlDate)).toUpperCase()}`],
      ...(since ? [['· UP'], [`${formatInt(since)}%`, true], ['SINCE']] : []),
    ]);
  }
  const subsidy = blockSubsidy(data.blockHeight);
  if (subsidy) {
    items.push([
      ['BLOCK REWARD'],
      [`${subsidy} BTC`, true],
      ['· DROPS TO'],
      [`${subsidy / 2} BTC`, true],
      ['AT THE NEXT HALVING'],
    ]);
  }
  if (net.avgBlockSeconds) {
    items.push([
      ['THE LAST 10 BLOCKS CAME EVERY'],
      [formatBlockTime(net.avgBlockSeconds), true],
      ['ON AVERAGE · TARGET 10M 00S'],
    ]);
  }
  const chg = toNumber(global.marketCapChangePercentage);
  if (chg !== null) {
    items.push([
      ['WHOLE CRYPTO MARKET'],
      [formatPct(chg, 1, { sign: true }), true],
      ['IN 24H'],
      ...(global.activeCryptocurrencies
        ? [[`· ${formatInt(global.activeCryptocurrencies)} COINS TRACKED`]]
        : []),
    ]);
  }
  items.push([
    ['DATA'],
    ['BINANCE · COINGECKO · BLOCKSTREAM', true],
    ['· NOT FINANCIAL ADVICE'],
  ]);
  return items;
};

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
