import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import Logo from './Logo';
import useNow from '../hooks/useNow';
import { palette, fonts } from '../theme/theme';
import {
  formatCompact,
  formatCountdown,
  formatInt,
  formatPct,
} from '../utils/format';

export const TIMEFRAMES = ['5M', '1H', '4H', '1D', '1W'];

const TF = {
  '5M': { seconds: 300, name: '5-MINUTE', span: 'hours' },
  '1H': { seconds: 3600, name: 'HOURLY', span: 'hours' },
  '4H': { seconds: 14400, name: '4-HOUR', span: 'days' },
  '1D': { seconds: 86400, name: 'DAILY', span: 'days' },
  '1W': { seconds: 604800, name: 'WEEKLY', span: 'weeks' },
};

const MA_PERIOD = 20;
// Breathing room (in candles) at each edge of the plot, and roughly half the
// width of a "HIGH $126,080" marker label in px
const LEFT_EDGE_BARS = 0.6;
const RIGHT_EDGE_BARS = 2;
const MARKER_HALF_PX = 72;
const priceFormatter = (price) =>
  `$${Math.round(price).toLocaleString('en-US')}`;

// lightweight-charts TickMarkType:
//   0 = Year, 1 = Month, 2 = DayOfMonth, 3 = Time, 4 = TimeWithSeconds
// Pick the format per tick level so day-aligned ticks don't read "May 1 00:00".
const fmtMonth = (d) =>
  d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
const fmtHour = (d) => `${String(d.getUTCHours()).padStart(2, '0')}:00`;
const fmtHourMinute = (d) =>
  `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

const tickFormatter = (timeframe) => (time, tickMarkType) => {
  const d = new Date(time * 1000);
  switch (tickMarkType) {
    case 0:
      return String(d.getUTCFullYear());
    case 1:
      return `${fmtMonth(d)} '${String(d.getUTCFullYear()).slice(-2)}`;
    case 2:
      return `${fmtMonth(d)} ${d.getUTCDate()}`;
    case 3:
      return timeframe === '5M' ? fmtHourMinute(d) : fmtHour(d);
    default:
      return timeframe === '5M'
        ? fmtHourMinute(d)
        : `${fmtMonth(d)} ${d.getUTCDate()}`;
  }
};

// The backend refreshes candles on a slow cadence (12h for 1D), but the live
// price lands every ~30s. Fold it into the open candle so the chart, the
// price line and the header always agree; start the next candle if its
// period has begun and the backend hasn't caught up yet.
const withLivePrice = (candles, price, intervalSec) => {
  if (!candles.length || !price) return candles;
  const last = candles[candles.length - 1];
  const periods = Math.floor((Date.now() / 1000 - last.time) / intervalSec);
  if (periods === 0) {
    return [
      ...candles.slice(0, -1),
      {
        ...last,
        close: price,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
      },
    ];
  }
  if (periods === 1) {
    return [
      ...candles,
      {
        time: last.time + intervalSec,
        open: last.close,
        high: Math.max(last.close, price),
        low: Math.min(last.close, price),
        close: price,
        volume: 0,
      },
    ];
  }
  return candles;
};

const movingAverage = (candles, period) =>
  candles.slice(period - 1).map((c, i) => ({
    time: c.time,
    value:
      candles.slice(i, i + period).reduce((sum, x) => sum + x.close, 0) /
      period,
  }));

// How much history the visible candles span, in viewer terms
const spanLabel = (count, intervalSec) => {
  const hours = (count * intervalSec) / 3600;
  if (hours <= 48) return `LAST ${Math.round(hours)} HOURS`;
  const days = hours / 24;
  if (days <= 120) return `LAST ${Math.round(days)} DAYS`;
  return `LAST ${Math.round(days / 7)} WEEKS`;
};

// Timeframe chips double as the rotation clock: the active one is solid
// yellow, and the next one fills up as its turn approaches.
const ChannelChips = ({ timeframe, rotatedAt, rotationMs }) => {
  const now = useNow(1000);
  const next =
    TIMEFRAMES[(TIMEFRAMES.indexOf(timeframe) + 1) % TIMEFRAMES.length];
  const progress =
    rotatedAt && rotationMs
      ? Math.min(1, Math.max(0, (now - rotatedAt) / rotationMs))
      : null;

  return (
    <Flex gap='6px'>
      {TIMEFRAMES.map((tf) => {
        const active = tf === timeframe;
        const upNext = tf === next && progress !== null;
        return (
          <Box
            key={tf}
            position='relative'
            overflow='hidden'
            border={`1px solid ${active || upNext ? palette.accent : palette.line}`}
            bg={active ? palette.accent : 'transparent'}
            transition='background 0.3s ease, border-color 0.3s ease'
          >
            {upNext && (
              <Box
                position='absolute'
                insetY={0}
                left={0}
                w={`${progress * 100}%`}
                bg={`${palette.accent}33`}
                borderRight={`2px solid ${palette.accent}`}
                transition='width 1s linear'
              />
            )}
            <Text
              position='relative'
              fontFamily={fonts.display}
              fontWeight='700'
              fontSize='22px'
              letterSpacing='0.08em'
              lineHeight='1'
              px='15px'
              py='7px'
              color={
                active ? palette.onAccent : upNext ? palette.ink : palette.dim
              }
            >
              {tf}
            </Text>
          </Box>
        );
      })}
    </Flex>
  );
};

const Toolbar = ({ timeframe, rotatedAt, rotationMs, candles }) => {
  const first = candles[0];
  const last = candles[candles.length - 1];
  const change = first && last ? (last.close / first.open - 1) * 100 : null;

  return (
    <Flex
      h='64px'
      flex='none'
      align='center'
      gap='18px'
      px='22px'
      borderBottom={`1px solid ${palette.line}`}
      fontFamily={fonts.display}
      whiteSpace='nowrap'
    >
      <Text
        fontSize='34px'
        fontWeight='800'
        letterSpacing='0.04em'
        color={palette.accent}
        lineHeight='1'
      >
        {TF[timeframe]?.name} CANDLES
      </Text>
      {change !== null && (
        <Flex align='baseline' gap='10px' ml='10px'>
          <Text
            fontSize='26px'
            fontWeight='700'
            color={change >= 0 ? palette.up : palette.down}
          >
            {change >= 0 ? '▲' : '▼'} {formatPct(Math.abs(change), 1)}
          </Text>
          <Text
            fontSize='17px'
            fontWeight='600'
            letterSpacing='0.2em'
            color={palette.dim}
          >
            {spanLabel(candles.length, TF[timeframe]?.seconds || 3600)}
          </Text>
        </Flex>
      )}
      <Box flex='1' />
      <ChannelChips
        timeframe={timeframe}
        rotatedAt={rotatedAt}
        rotationMs={rotationMs}
      />
    </Flex>
  );
};

// What the open candle covers, in words a viewer can read at a glance
const PERIOD = {
  '5M': 'THIS 5 MIN',
  '1H': 'THIS HOUR',
  '4H': 'THIS 4 HOURS',
  '1D': 'TODAY',
  '1W': 'THIS WEEK',
};

const Label = ({ children }) => (
  <Text
    fontFamily={fonts.display}
    fontSize='16px'
    fontWeight='600'
    letterSpacing='0.14em'
    color={palette.dim}
  >
    {children}
  </Text>
);

// Prices stay neutral; only the change carries up/down colour, and the
// average keeps the colour of its line on the chart
const Pair = ({ k, v, color = palette.ink }) => (
  <Flex align='center' gap='8px'>
    <Label>{k}</Label>
    <Text color={color}>{v}</Text>
  </Flex>
);

const Legend = ({ timeframe, candles, ma }) => {
  const now = useNow(1000);
  const last = candles[candles.length - 1];
  const interval = TF[timeframe]?.seconds;
  const closesIn = last && interval ? last.time + interval - now / 1000 : null;
  const change = last ? (last.close / last.open - 1) * 100 : null;
  const up = (change ?? 0) >= 0;
  const lastMa = ma[ma.length - 1];

  return (
    <Flex
      h='46px'
      flex='none'
      align='center'
      gap='20px'
      px='22px'
      fontFamily={fonts.mono}
      fontSize='19px'
      fontWeight='500'
      whiteSpace='nowrap'
      bg='rgba(4, 8, 20, 0.35)'
      borderBottom={`1px solid ${palette.lineSoft}`}
    >
      <Text
        fontFamily={fonts.display}
        fontSize='19px'
        fontWeight='700'
        letterSpacing='0.12em'
        color={palette.accent}
        border={`1px solid ${palette.accent}66`}
        px='10px'
        py='2px'
      >
        {PERIOD[timeframe]}
      </Text>
      {last && (
        <>
          <Pair k='OPEN' v={formatInt(last.open)} />
          <Pair k='HIGH' v={formatInt(last.high)} />
          <Pair k='LOW' v={formatInt(last.low)} />
          <Text fontWeight='700' color={up ? palette.up : palette.down}>
            {up ? '▲' : '▼'} {formatPct(Math.abs(change))}
          </Text>
        </>
      )}
      {lastMa && (
        <Pair
          k={`${MA_PERIOD}-AVG`}
          v={formatInt(lastMa.value)}
          color={palette.market}
        />
      )}
      {last?.volume > 0 && (
        <Pair k='VOLUME' v={`${formatCompact(last.volume)} BTC`} />
      )}
      <Box flex='1' />
      {closesIn !== null && closesIn > 0 && (
        <Flex align='center' gap='10px'>
          <Label>CLOSES IN</Label>
          <Text fontSize='21px' fontWeight='700' color={palette.accent}>
            {formatCountdown(closesIn)}
          </Text>
        </Flex>
      )}
    </Flex>
  );
};

// The wipe covers the chart from 30% to 70% of its run (see the `wipe`
// keyframes); swap the series just after it's fully covered
const WIPE_MS = 1600;
const SWAP_DELAY_MS = 520;

// A broadcast "channel switch" sweep that covers the chart while the
// timeframe rotates, so viewers never see the series jump. Doubles as a
// station ident: the logo rides in with it.
const SwitchWipe = ({ timeframe }) => (
  <Box
    position='absolute'
    inset={0}
    zIndex={3}
    pointerEvents='none'
    overflow='hidden'
  >
    <Flex
      position='absolute'
      inset={0}
      align='center'
      justify='center'
      gap='44px'
      bg={palette.stage}
      borderRight={`14px solid ${palette.accent}`}
      fontFamily={fonts.display}
      transform='translateX(-101%)'
      animation={`wipe ${WIPE_MS}ms cubic-bezier(0.7, 0, 0.3, 1) forwards`}
    >
      <Logo height={150} />
      <Box w='4px' h='150px' bg={palette.accent} />
      <Box>
        <Text
          fontSize='30px'
          fontWeight='700'
          letterSpacing='0.24em'
          color={palette.mute}
        >
          NOW SHOWING
        </Text>
        <Text
          fontSize='88px'
          fontWeight='800'
          lineHeight='1'
          color={palette.accent}
        >
          {TF[timeframe]?.name} CANDLES
        </Text>
      </Box>
    </Flex>
  </Box>
);

const Chart = ({
  ohlcData,
  timeframe: incoming,
  livePrice,
  rotatedAt,
  rotationMs,
}) => {
  const containerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef({});
  const [timeframe, setTimeframe] = useState(incoming);
  const [wipes, setWipes] = useState(0);

  useEffect(() => {
    if (incoming === timeframe) return undefined;
    setWipes((n) => n + 1);
    const id = setTimeout(() => setTimeframe(incoming), SWAP_DELAY_MS);
    return () => clearTimeout(id);
  }, [incoming, timeframe]);

  const ohlc = ohlcData?.[timeframe];
  const interval = TF[timeframe]?.seconds || 3600;
  const candles = useMemo(
    () =>
      withLivePrice(
        (ohlc || []).map(({ time, open, high, low, close, volume }) => ({
          time,
          open,
          high,
          low,
          close,
          volume,
        })),
        livePrice,
        interval
      ),
    [ohlc, livePrice, interval]
  );
  const ma = useMemo(() => movingAverage(candles, MA_PERIOD), [candles]);

  // Build the chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: palette.mute,
        fontSize: 18,
        fontFamily: fonts.mono,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(238, 242, 255, 0.06)' },
      },
      crosshair: { mode: CrosshairMode.Hidden },
      localization: { priceFormatter },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.24 },
        entireTextOnly: true,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: tickFormatter(timeframe),
      },
      handleScroll: false,
      handleScale: false,
    });

    const candlesSeries = chart.addCandlestickSeries({
      upColor: palette.up,
      downColor: palette.down,
      borderUpColor: palette.up,
      borderDownColor: palette.down,
      wickUpColor: palette.up,
      wickDownColor: palette.down,
      priceLineColor: palette.accent,
      priceLineWidth: 2,
      priceLineStyle: LineStyle.Dashed,
      priceFormat: { type: 'custom', formatter: priceFormatter, minMove: 1 },
    });

    const volume = chart.addHistogramSeries({
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    const maLine = chart.addLineSeries({
      color: palette.market,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = { candles: candlesSeries, volume, maLine };

    // Canvas text is drawn with whatever font is loaded at paint time;
    // repaint once the webfonts arrive.
    document.fonts?.ready.then(() =>
      chartRef.current?.applyOptions({ layout: { fontFamily: fonts.mono } })
    );

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chartRef.current?.applyOptions({
      timeScale: { tickMarkFormatter: tickFormatter(timeframe) },
    });
  }, [timeframe]);

  useEffect(() => {
    const { candles: cs, volume, maLine } = seriesRef.current;
    if (!cs) return;

    cs.setData(candles);
    maLine.setData(ma);
    volume.setData(
      candles.map((c) => ({
        time: c.time,
        value: c.volume || 0,
        color: c.close >= c.open ? `${palette.up}55` : `${palette.down}55`,
      }))
    );

    if (!candles.length) return;
    const hi = candles.reduce((a, c) => (c.high > a.high ? c : a));
    const lo = candles.reduce((a, c) => (c.low < a.low ? c : a));
    const label = 'rgba(238, 242, 255, 0.85)';
    cs.setMarkers(
      [
        {
          time: hi.time,
          position: 'aboveBar',
          shape: 'arrowDown',
          color: label,
          text: `HIGH ${priceFormatter(hi.high)}`,
        },
        {
          time: lo.time,
          position: 'belowBar',
          shape: 'arrowUp',
          color: label,
          text: `LOW ${priceFormatter(lo.low)}`,
        },
      ].sort((a, b) => a.time - b.time)
    );

    // Fill the plot edge to edge, and only open up an edge when the HIGH or
    // LOW label sits on one of the outermost candles and would be clipped
    const n = candles.length;
    const plotPx = chartRef.current?.timeScale().width() || 1300;
    const barPx = plotPx / (n - 1 + LEFT_EDGE_BARS + RIGHT_EDGE_BARS);
    const halfLabel = MARKER_HALF_PX / barPx;
    const first = Math.min(candles.indexOf(hi), candles.indexOf(lo));
    const lastMarker = Math.max(candles.indexOf(hi), candles.indexOf(lo));
    chartRef.current?.timeScale().setVisibleLogicalRange({
      from: -Math.max(LEFT_EDGE_BARS, halfLabel - first),
      to: n - 1 + Math.max(RIGHT_EDGE_BARS, halfLabel - (n - 1 - lastMarker)),
    });
  }, [candles, ma]);

  return (
    <Flex
      direction='column'
      h='100%'
      bg={`linear-gradient(180deg, ${palette.card}, ${palette.panel})`}
      border={`1px solid ${palette.line}`}
      borderRadius='14px'
      overflow='hidden'
    >
      <Toolbar
        timeframe={incoming}
        rotatedAt={rotatedAt}
        rotationMs={rotationMs}
        candles={candles}
      />
      <Legend timeframe={timeframe} candles={candles} ma={ma} />
      <Box position='relative' flex='1' minH={0}>
        <Box ref={containerRef} position='absolute' inset='8px 6px 4px 10px' />
        {wipes > 0 && <SwitchWipe key={wipes} timeframe={incoming} />}
      </Box>
    </Flex>
  );
};

export default Chart;
