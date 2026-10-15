import React, { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { palette } from '../theme/theme';

export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

const fit = () => {
  if (typeof window === 'undefined') return { scale: 1, left: 0, top: 0 };
  const scale = Math.min(
    window.innerWidth / STAGE_WIDTH,
    window.innerHeight / STAGE_HEIGHT
  );
  return {
    scale,
    left: (window.innerWidth - STAGE_WIDTH * scale) / 2,
    top: (window.innerHeight - STAGE_HEIGHT * scale) / 2,
  };
};

// The broadcast is designed on a fixed 1920×1080 canvas (what the streamer
// captures) and scaled to fit any other window, letterboxed, so the layout
// never reflows or scrolls.
const Stage = ({ children }) => {
  const [{ scale, left, top }, setFit] = useState(fit);

  useEffect(() => {
    const onResize = () => setFit(fit());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <Box position='fixed' inset={0} overflow='hidden' bg='#02040B'>
      <Box
        position='absolute'
        left={`${left}px`}
        top={`${top}px`}
        w={`${STAGE_WIDTH}px`}
        h={`${STAGE_HEIGHT}px`}
        transform={`scale(${scale})`}
        transformOrigin='top left'
        overflow='hidden'
        bg={palette.stage}
        backgroundImage={`radial-gradient(1200px 520px at 18% -8%, rgba(255,214,10,0.07), transparent 60%), radial-gradient(900px 600px at 100% 110%, rgba(0,229,255,0.06), transparent 60%), linear-gradient(160deg, ${palette.stage} 0%, #0B1330 100%)`}
      >
        {/* Shared hand-drawn wobble for every sketch on the stage */}
        <svg width='0' height='0' style={{ position: 'absolute' }} aria-hidden>
          <filter id='sketch-wobble'>
            <feTurbulence
              type='fractalNoise'
              baseFrequency='0.035'
              numOctaves='2'
              seed='7'
            />
            <feDisplacementMap in='SourceGraphic' scale='2.6' />
          </filter>
        </svg>
        {children}
      </Box>
    </Box>
  );
};

export default Stage;
