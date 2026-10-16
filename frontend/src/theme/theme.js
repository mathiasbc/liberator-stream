import { extendTheme } from '@chakra-ui/react';

// "On Air" broadcast palette. Values stay white; colour carries meaning:
// yellow = the price and anything "active", mint/coral = up/down,
// and one colour per metric family (market, cycle, sats, chain).
export const palette = {
  stage: '#070C1C',
  deep: '#040814',
  panel: '#0B1229',
  card: '#101935',
  line: '#1E2B55',
  lineSoft: 'rgba(238, 242, 255, 0.08)',
  ink: '#EEF2FF',
  mute: 'rgba(238, 242, 255, 0.64)',
  dim: 'rgba(238, 242, 255, 0.50)',
  onAccent: '#0A0F22',

  accent: '#FFD60A',
  accentGlow: 'rgba(255, 214, 10, 0.32)',
  live: '#FF2E63',
  up: '#00E676',
  down: '#FF2E63',

  market: '#B362FF',
  cycle: '#FF4FA0',
  sats: '#FF9A1F',
  chain: '#00E5FF',
};

export const fonts = {
  display: '"Barlow Condensed", "Arial Narrow", sans-serif',
  body: '"Barlow", "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

const theme = extendTheme({
  colors: {
    brand: { ...palette },
  },
  fonts: {
    body: fonts.body,
    heading: fonts.display,
    mono: fonts.mono,
  },
  styles: {
    global: {
      '*': {
        boxSizing: 'border-box',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility',
      },
      'html, body': {
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: '#02040B',
        color: palette.ink,
        fontFamily: fonts.body,
      },
      '#root': {
        width: '100%',
        height: '100%',
      },
      '@keyframes pulse': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.35 },
      },
      '@keyframes tickerIn': {
        from: { opacity: 0, transform: 'translateY(60%)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
      '@keyframes progress': {
        from: { width: '0%' },
        to: { width: '100%' },
      },
      '@keyframes postIn': {
        from: { opacity: 0, transform: 'translateY(18px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
      '@keyframes flashUp': {
        '0%': { color: palette.up, textShadow: `0 0 36px ${palette.up}` },
        '100%': { color: palette.accent },
      },
      '@keyframes flashDown': {
        '0%': { color: palette.down, textShadow: `0 0 36px ${palette.down}` },
        '100%': { color: palette.accent },
      },
      '@keyframes wipe': {
        '0%': { transform: 'translateX(-101%)' },
        '30%, 70%': { transform: 'translateX(0)' },
        '100%': { transform: 'translateX(101%)' },
      },
      '@keyframes newBlock': {
        '0%': { boxShadow: `inset 0 0 0 2px ${palette.chain}` },
        '100%': { boxShadow: 'inset 0 0 0 2px transparent' },
      },
    },
  },
});

export default theme;
