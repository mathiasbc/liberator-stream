import { extendTheme } from '@chakra-ui/react';

const colors = {
  pastelPink: '#FF4FA0',
  pastelPeach: '#FF8A3D',
  pastelMint: '#00E676',
  pastelYellow: '#FFD60A',
  pastelLavender: '#B362FF',
  pastelGreen: '#54E0FF',
  pastelCoral: '#FF2E63',
  pastelBlue: '#00E5FF',
  bitcoinOrange: '#FF9A1F',
  darkBg: '#070C1C',
  darkCard: '#101935',
  darkBorder: '#1E2B55',
  priceHero: '#FFD60A',
  priceHeroGlow: 'rgba(255, 214, 10, 0.45)',
};

const bodyGradient =
  'linear-gradient(135deg, #070C1C 0%, #0E1530 55%, #131C3E 100%)';

const theme = extendTheme({
  colors: {
    brand: { ...colors },
  },
  fonts: {
    body: '"Segoe UI", system-ui, sans-serif',
    heading: '"Segoe UI", system-ui, sans-serif',
  },
  styles: {
    global: {
      '*': {
        boxSizing: 'border-box',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility',
      },
      html: {
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
        overflowX: 'hidden',
      },
      body: {
        width: '100%',
        minHeight: '100vh',
        margin: 0,
        padding: 0,
        background: bodyGradient,
        color: 'white',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        overflowX: 'hidden',
        fontSize: { base: '14px', md: '16px' },
        lineHeight: '1.5',
      },
      '#root': {
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      },
      '@keyframes pulse': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.4 },
      },
      '@keyframes shimmer': {
        '0%': { transform: 'translateX(-100%)' },
        '100%': { transform: 'translateX(200%)' },
      },
    },
  },
});

export default theme;
