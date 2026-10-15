import React, { useEffect, useRef, useState } from 'react';
import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import Sketch from './Sketch';
import useNow from '../hooks/useNow';
import { palette, fonts } from '../theme/theme';
import {
  formatAgo,
  formatCompact,
  formatEta,
  formatInt,
  formatMonthYear,
} from '../utils/format';
import { difficultyInfo, halvingInfo } from '../utils/metrics';

const NEW_BLOCK_MS = 30000;

const Label = ({ children, ...props }) => (
  <Text
    fontFamily={fonts.display}
    fontSize='16px'
    fontWeight='600'
    letterSpacing='0.18em'
    color={palette.dim}
    lineHeight='1'
    whiteSpace='nowrap'
    {...props}
  >
    {children}
  </Text>
);

// Countdown to a protocol milestone: big ETA, epoch progress, blocks left
const Epoch = ({ label, value, progress, detail, color }) => (
  <Box px='20px' py='12px'>
    <Label>{label}</Label>
    <Text
      fontFamily={fonts.display}
      fontSize='30px'
      fontWeight='700'
      lineHeight='1.1'
      mt='6px'
      color={palette.ink}
    >
      {value}
    </Text>
    <Box h='8px' mt='8px' bg={palette.line} position='relative'>
      <Box
        position='absolute'
        insetY={0}
        left={0}
        w={`${(progress || 0) * 100}%`}
        bg={color}
        boxShadow={`0 0 10px ${color}88`}
      />
    </Box>
    <Text
      fontFamily={fonts.display}
      fontSize='17px'
      color={palette.mute}
      mt='6px'
      whiteSpace='nowrap'
    >
      {detail}
    </Text>
  </Box>
);

const Fee = ({ label, value }) => (
  <Flex direction='column' align='center' gap='6px'>
    <Text
      fontFamily={fonts.display}
      fontSize='38px'
      fontWeight='700'
      lineHeight='1'
      color={palette.ink}
    >
      {value ?? '—'}
    </Text>
    <Label fontSize='14px'>{label}</Label>
  </Flex>
);

const NetworkPulse = ({ blockHeight, networkData }) => {
  const now = useNow(1000);
  const net = networkData || {};
  const fees = net.fees || {};
  const mempool = net.mempool || {};

  // Flag fresh blocks for a little while so viewers notice them land
  const prevHeight = useRef(blockHeight);
  const [newBlockAt, setNewBlockAt] = useState(null);
  useEffect(() => {
    if (prevHeight.current && blockHeight > prevHeight.current) {
      setNewBlockAt(Date.now());
    }
    prevHeight.current = blockHeight;
  }, [blockHeight]);
  const isNew = newBlockAt && now - newBlockAt < NEW_BLOCK_MS;

  const sinceBlock = net.lastBlockTime ? now / 1000 - net.lastBlockTime : null;
  const difficulty = difficultyInfo(blockHeight, net.avgBlockSeconds);
  const halving = halvingInfo(blockHeight, now);

  return (
    <Flex
      direction='column'
      flex='none'
      bg={`linear-gradient(180deg, ${palette.card}, ${palette.panel})`}
      border={`1px solid ${palette.line}`}
      borderRadius='14px'
      overflow='hidden'
    >
      <Flex
        h='52px'
        align='center'
        gap='12px'
        px='18px'
        borderBottom={`1px solid ${palette.line}`}
      >
        <Sketch name='blocks' color={palette.chain} size={34} />
        <Text
          fontFamily={fonts.display}
          fontSize='25px'
          fontWeight='800'
          letterSpacing='0.12em'
        >
          NETWORK
        </Text>
        <Box flex='1' />
        <Label>MEMPOOL</Label>
        <Text
          fontFamily={fonts.display}
          fontSize='20px'
          fontWeight='600'
          whiteSpace='nowrap'
        >
          {mempool.count ? formatCompact(mempool.count) : '—'}{' '}
          <Text as='span' color={palette.mute} fontWeight='500'>
            tx
            {mempool.vsize ? ` · ${(mempool.vsize / 1e6).toFixed(1)} vMB` : ''}
          </Text>
        </Text>
      </Flex>

      <Grid
        templateColumns='1fr 1fr'
        borderBottom={`1px solid ${palette.lineSoft}`}
      >
        <Box
          key={newBlockAt || 'block'}
          px='20px'
          py='14px'
          borderRight={`1px solid ${palette.lineSoft}`}
          animation={isNew ? 'newBlock 2.4s ease-out 3' : undefined}
        >
          <Flex align='center' gap='10px'>
            <Label>{isNew ? 'NEW BLOCK' : 'LAST BLOCK'}</Label>
            {isNew && (
              <Box
                w='9px'
                h='9px'
                borderRadius='50%'
                bg={palette.chain}
                animation='pulse 1s infinite'
              />
            )}
          </Flex>
          <Text
            fontFamily={fonts.display}
            fontSize='40px'
            fontWeight='700'
            lineHeight='1.1'
            mt='6px'
            color={isNew ? palette.chain : palette.ink}
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            #{formatInt(blockHeight)}
          </Text>
          <Text fontFamily={fonts.display} fontSize='18px' color={palette.mute}>
            {sinceBlock !== null ? `found ${formatAgo(sinceBlock)} ago` : '—'}
            {net.lastBlockTxCount
              ? ` · ${formatInt(net.lastBlockTxCount)} tx`
              : ''}
          </Text>
        </Box>
        <Box px='16px' py='14px'>
          <Flex align='center' gap='8px'>
            <Label>FEES</Label>
            <Label fontSize='14px' letterSpacing='0.06em'>
              sat/vB
            </Label>
          </Flex>
          <Flex justify='space-around' mt='10px'>
            <Fee label='NEXT' value={fees.fastest} />
            <Fee label='30 MIN' value={fees.halfHour} />
            <Fee label='1 HOUR' value={fees.hour} />
          </Flex>
        </Box>
      </Grid>

      <Grid templateColumns='1fr 1fr'>
        <Box borderRight={`1px solid ${palette.lineSoft}`}>
          <Epoch
            label='DIFFICULTY ADJ.'
            color={palette.chain}
            value={difficulty ? `in ${formatEta(difficulty.secondsLeft)}` : '—'}
            progress={difficulty?.progress}
            detail={
              difficulty
                ? `${formatInt(difficulty.blocksLeft)} blocks · ${Math.floor(difficulty.progress * 100)}% of epoch`
                : '—'
            }
          />
        </Box>
        <Epoch
          label='NEXT HALVING'
          color={palette.sats}
          value={halving ? `≈ ${formatMonthYear(halving.eta)}` : '—'}
          progress={halving?.progress}
          detail={
            halving
              ? `${formatInt(halving.blocksLeft)} blocks · ${Math.floor(halving.progress * 100)}% of epoch`
              : '—'
          }
        />
      </Grid>
    </Flex>
  );
};

export default NetworkPulse;
