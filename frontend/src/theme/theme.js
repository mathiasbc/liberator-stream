import { extendTheme } from '@chakra-ui/react';

// Enhanced vivid color palette
const colors = {
  pastelPink: '#FF8AC7',
  pastelPeach: '#FFAA66',
  pastelMint: '#7FDFB8',
  pastelYellow: '#FFD54F',
  pastelLavender: '#C785FF',
  pastelGreen: '#89CDF1',
  pastelCoral: '#FF7A85',
  pastelBlue: '#5DD5FF',
  bitcoinOrange: '#F7931A', // Official Bitcoin orange color
  darkBg: '#0D0D0D',
  darkCard: '#1A1A1A',
  darkBorder: '#2A2A2A',
};

const theme = extendTheme({
  colors: {
    brand: {
      ...colors,
    },
  },
  fonts: {
    body: '"Segoe UI", system-ui, sans-serif',
    heading: '"Segoe UI", system-ui, sans-serif',
  },
  styles: {
    global: {
      '*': {
        boxSizing: 'border-box',
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
        background: `linear-gradient(135deg, ${colors.darkBg} 0%, #111111 100%)`,
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
      // Add keyframe animation for pulse effect
      '@keyframes pulse': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.5 },
      },
      // Add keyframe animation for shimmer effect
      '@keyframes shimmer': {
        '0%': { transform: 'translateX(-100%)' },
        '100%': { transform: 'translateX(200%)' },
      },
    },
  },
  components: {
    Button: {
      variants: {
        timeframe: {
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          outline: 'none',
          _hover: {
            transform: 'translateY(-1px)',
          },
        },
      },
    },
  },
});

export default theme;
