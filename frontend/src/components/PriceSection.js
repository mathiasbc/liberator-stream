import React, { useEffect, useRef, useState } from 'react';
import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import Logo from './Logo';
import Sketch from './Sketch';
import { palette, fonts } from '../theme/theme';
import {
  formatCompactUsd,
  formatInt,
  formatMonthShort,
  formatPct,
  formatUsd,
  toNumber,
} from '../utils/format';
import { athInfo, rangePosition, satsPerDollar } from '../utils/metrics';

const Plate = ({ color, sketch, sketchProps, label, value, sub }) => (
  <Flex
    align='center'
    gap='12px'
    pl='12px'
    pr='10px'
    minW={0}
    borderLeft={`5px solid ${color}`}
    bg={`linear-gradient(90deg, ${color}26, ${color}08 70%, transparent)`}
  >
    <Sketch name={sketch} color={color} size={50} {...sketchProps} />
    <Box minW={0} fontFamily={fonts.display} lineHeight='1'>
      <Text
        fontSize='16px'
        fontWeight='600'
        letterSpacing='0.16em'
        color={palette.mute}
        whiteSpace='nowrap'
      >
        {label}
      </Text>
      <Text
        fontSize='42px'
        fontWeight='700'
        color={palette.ink}
        mt='4px'
        whiteSpace='nowrap'
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </Text>
      <Text
        fontSize='16px'
        fontWeight='500'
        color={palette.dim}
        mt='5px'
        whiteSpace='nowrap'
        overflow='hidden'
        textOverflow='ellipsis'
      >
        {sub}
      </Text>
    </Box>
  </Flex>
);

const RangeLabel = ({ label, value }) => (
  <Flex align='baseline' gap='8px' lineHeight='1' whiteSpace='nowrap'>
    <Text
      fontFamily={fonts.display}
      fontSize='16px'
      fontWeight='600'
      letterSpacing='0.16em'
      color={palette.dim}
    >
      {label}
    </Text>
    <Text
      fontFamily={fonts.mono}
      fontSize='17px'
      fontWeight='600'
      color={palette.ink}
      sx={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {value}
    </Text>
  </Flex>
);

// Where the price sits in today's range. The track is neutral; only the
// stretch from 24 hours ago to now is coloured, green if up and red if down
// (the same move as the 24H badge), and the yellow dot is the price.
const DayRange = ({ price, open, high, low }) => {
  const pos = rangePosition(price, low, high);
  const openPos = rangePosition(open, low, high);
  const move =
    pos !== null && openPos !== null
      ? {
          left: Math.min(pos, openPos),
          width: Math.abs(pos - openPos),
          color: price >= open ? palette.up : palette.down,
        }
      : null;
  return (
    <Box flex='1' minW={0}>
      <Flex justify='space-between'>
        <RangeLabel label='24H LOW' value={formatUsd(low)} />
        <RangeLabel label='24H HIGH' value={formatUsd(high)} />
      </Flex>
      <Box
        position='relative'
        h='6px'
        mt='12px'
        mx='8px'
        borderRadius='99px'
        bg={palette.line}
      >
        {move && (
          <Box
            position='absolute'
            top={0}
            bottom={0}
            left={`${move.left * 100}%`}
            w={`${move.width * 100}%`}
            borderRadius='99px'
            bg={move.color}
            transition='left 0.8s ease, width 0.8s ease'
          />
        )}
        {openPos !== null && (
          <Box
            position='absolute'
            top='-5px'
            left={`${openPos * 100}%`}
            w='2px'
            h='16px'
            bg={palette.mute}
            transform='translateX(-50%)'
          />
        )}
        {pos !== null && (
          <Box
            position='absolute'
            top='50%'
            left={`${pos * 100}%`}
            w='16px'
            h='16px'
            borderRadius='50%'
            bg={palette.accent}
            border={`3px solid ${palette.stage}`}
            transform='translate(-50%, -50%)'
            boxShadow={`0 0 10px ${palette.accentGlow}`}
            transition='left 0.8s ease'
          />
        )}
      </Box>
    </Box>
  );
};

// The stream ticks every second; flashing the whole price that often is
// noise, so the big number pulses at most this often and a small readout
// shows every tick.
const FLASH_GAP_MS = 5000;

const PriceBlock = ({ price, change, open, high, low }) => {
  const prev = useRef(price);
  const lastFlash = useRef(0);
  const [flash, setFlash] = useState(null);
  const [tick, setTick] = useState(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = price;
    if (!before || !price || price === before) return;
    const dir = price > before ? 'up' : 'down';
    setTick({ dir, delta: price - before });
    const now = Date.now();
    if (now - lastFlash.current >= FLASH_GAP_MS) {
      lastFlash.current = now;
      setFlash({ dir, key: now });
    }
  }, [price]);

  const text = price ? formatUsd(price) : '—';
  const positive = (change || 0) >= 0;

  return (
    <Flex direction='column' justify='center' w='600px' flex='none'>
      <Flex align='center' gap='14px'>
        <Text
          bg={palette.accent}
          color={palette.onAccent}
          fontFamily={fonts.display}
          fontWeight='800'
          fontSize='21px'
          letterSpacing='0.18em'
          lineHeight='1'
          px='12px'
          py='4px'
        >
          BTC / USD
        </Text>
        {tick && (
          <Text
            key={`${tick.dir}-${tick.delta}`}
            fontFamily={fonts.mono}
            fontWeight='700'
            fontSize='18px'
            color={tick.dir === 'up' ? palette.up : palette.down}
            animation='postIn 0.35s ease-out'
          >
            {tick.dir === 'up' ? '▲' : '▼'} {formatUsd(Math.abs(tick.delta), 2)}
          </Text>
        )}
      </Flex>
      <Text
        key={flash?.key}
        fontFamily={fonts.display}
        fontWeight='800'
        fontSize={text.length >= 8 ? '128px' : '140px'}
        lineHeight='0.84'
        mt='10px'
        color={palette.accent}
        textShadow={`0 0 40px ${palette.accentGlow}`}
        whiteSpace='nowrap'
        sx={{ fontVariantNumeric: 'tabular-nums' }}
        animation={
          flash
            ? `${flash.dir === 'up' ? 'flashUp' : 'flashDown'} 1.2s ease-out`
            : undefined
        }
      >
        {text}
      </Text>
      <Flex align='center' gap='22px' mt='14px'>
        <Flex
          align='center'
          flex='none'
          gap='10px'
          bg={positive ? palette.up : palette.down}
          color={positive ? palette.onAccent : '#fff'}
          fontFamily={fonts.display}
          fontWeight='800'
          px='16px'
          h='34px'
          clipPath='polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)'
        >
          <Text fontSize='18px'>{positive ? '▲' : '▼'}</Text>
          <Text fontSize='27px' letterSpacing='0.04em'>
            {formatPct(Math.abs(change || 0))}
          </Text>
          <Text fontSize='17px' opacity={0.85} letterSpacing='0.1em'>
            24H
          </Text>
        </Flex>
        <DayRange price={price} open={open} high={high} low={low} />
      </Flex>
    </Flex>
  );
};

const PriceSection = ({ data }) => {
  const price = data.currentPrice;
  const ath = athInfo(price, data.extendedSupplyData);
  const dominance = toNumber(data.marketDominance);
  const supply = data.totalSupply || {};
  const sats = satsPerDollar(price);
  const rank = data.extendedSupplyData?.marketCapRank;
  const totalMarket = data.globalMarketData?.totalMarketCap;

  return (
    <Flex h='200px' align='center' gap='28px'>
      <Flex w='290px' flex='none' justify='center' align='center'>
        <Logo height={98} />
      </Flex>
      <Box w='1px' alignSelf='stretch' bg={palette.line} />
      <PriceBlock
        price={price}
        change={data.priceChange}
        open={data.dayOpen}
        high={data.dayHigh}
        low={data.dayLow}
      />
      <Grid
        flex='1'
        minW={0}
        h='100%'
        templateColumns='repeat(3, minmax(0, 1fr))'
        templateRows='repeat(2, 1fr)'
        gap='12px 12px'
      >
        <Plate
          color={palette.market}
          sketch='bag'
          label='MARKET CAP'
          value={formatCompactUsd(data.marketCap)}
          sub={rank ? `#${rank} crypto asset` : 'Bitcoin network value'}
        />
        <Plate
          color={palette.cycle}
          sketch='pie'
          sketchProps={{ share: dominance ? dominance / 100 : 0.5 }}
          label='DOMINANCE'
          value={dominance ? `${dominance.toFixed(1)}%` : '—'}
          sub={
            totalMarket
              ? `of ${formatCompactUsd(totalMarket)} crypto market`
              : 'share of crypto market'
          }
        />
        <Plate
          color={palette.sats}
          sketch='coin'
          label='SATS PER DOLLAR'
          value={formatInt(sats)}
          sub='sats one US dollar buys'
        />
        <Plate
          color={palette.market}
          sketch='bars'
          label='VOLUME 24H'
          value={formatCompactUsd(data.volume)}
          sub='BTC/USDT spot on Binance'
        />
        <Plate
          color={palette.cycle}
          sketch='mountain'
          label='FROM ATH'
          value={ath ? formatPct(ath.fromAth) : '—'}
          sub={
            ath
              ? `ATH ${formatUsd(ath.athPrice)} · ${formatMonthShort(ath.athDate)}`
              : 'all-time high'
          }
        />
        <Plate
          color={palette.sats}
          sketch='pick'
          label='SUPPLY MINED'
          value={supply.percentage ? `${supply.percentage}%` : '—'}
          sub={
            supply.current
              ? `${(supply.current / 1e6).toFixed(2)}M of 21M BTC`
              : 'of 21M BTC'
          }
        />
      </Grid>
    </Flex>
  );
};

export default PriceSection;
