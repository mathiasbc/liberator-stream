import React from 'react';

// Hand-drawn neon doodles for the metric plates. Drawn on a 64×64 grid with
// round strokes; the shared #sketch-wobble filter (defined in Stage) gives
// them the marker-on-glass feel.
const fill = { fill: 'currentColor', fillOpacity: 0.28 };
const dot = { fill: 'currentColor', stroke: 'none' };

// Slice of a pie starting at 12 o'clock, `share` in 0..1
const slice = (share, r = 23, c = 32) => {
  const a = Math.min(0.999, Math.max(0.001, share)) * Math.PI * 2;
  const x = c + r * Math.sin(a);
  const y = c - r * Math.cos(a);
  return `M${c} ${c} V${c - r} A${r} ${r} 0 ${share > 0.5 ? 1 : 0} 1 ${x.toFixed(1)} ${y.toFixed(1)} Z`;
};

const DRAWINGS = {
  bag: () => (
    <>
      <path d='M24 10 Q32 16 40 10 L36 19 H28 Z' />
      <path d='M28 19 C9 29 9 57 32 57 C55 57 55 29 36 19' />
      <path d='M37 31 C35 27 27 28 28 33 C29 37 37 36 37 42 C37 47 29 47 27 43 M32 25 V50' />
    </>
  ),
  bars: () => (
    <>
      <path d='M9 54 V40 M19 54 V26 M29 54 V33 M39 54 V15 M49 54 V30 M58 54 V22' />
      <path d='M4 59 H61' />
    </>
  ),
  pie: ({ share = 0.5 }) => (
    <>
      <circle cx='32' cy='32' r='23' />
      <path d={slice(share)} style={fill} />
    </>
  ),
  mountain: () => (
    <>
      <path d='M5 56 L23 24 L31 36 L42 14 L59 56 Z' />
      <path d='M42 14 V3 L52 7 L42 11' />
      <circle cx='48' cy='29' r='3.6' style={dot} />
    </>
  ),
  // The "sat" symbol inside a coin
  coin: () => (
    <>
      <circle cx='32' cy='32' r='24' />
      <path d='M32 14 V50 M21 24 H43 M21 32 H43 M21 40 H43' />
    </>
  ),
  // Pickaxe in the ⛏ pose: crescent head, socket, handle down-left
  pick: () => (
    <g transform='rotate(40 32 34)'>
      <path d='M3 26 C15 6 49 6 61 26 C49 16 15 16 3 26 Z' style={fill} />
      <path d='M28 13 h8 v7 h-8 Z' style={fill} />
      <path d='M32 20 V62' />
    </g>
  ),
  blocks: () => (
    <>
      <rect x='3' y='25' width='15' height='15' rx='2' />
      <rect x='25' y='25' width='15' height='15' rx='2' />
      <rect x='47' y='25' width='15' height='15' rx='2' style={fill} />
      <path d='M18 32 h7 M40 32 h7' />
    </>
  ),
  hourglass: () => (
    <>
      <path d='M16 7 H48 M16 57 H48' />
      <path d='M20 7 C20 23 30 27 32 32 C34 37 44 41 44 57' />
      <path d='M44 7 C44 23 34 27 32 32 C30 37 20 41 20 57' />
      <path d='M25 55 L39 55 L32 46 Z' style={fill} />
    </>
  ),
  flame: () => (
    <>
      <path d='M32 58 C17 58 11 45 16 34 C19 27 26 22 26 10 C35 17 41 25 41 33 C43 29 45 26 45 21 C52 30 54 39 51 46 C48 53 42 58 32 58 Z' />
      <path
        d='M32 52 C26 52 24 46 27 41 C29 38 31 36 31 31 C36 35 39 40 38 45 C37 49 35 52 32 52 Z'
        style={fill}
      />
    </>
  ),
  queue: () => (
    <>
      <rect x='6' y='38' width='14' height='14' rx='2' />
      <rect x='25' y='38' width='14' height='14' rx='2' />
      <rect x='44' y='38' width='14' height='14' rx='2' />
      <rect x='15' y='20' width='14' height='14' rx='2' />
      <rect x='34' y='20' width='14' height='14' rx='2' style={fill} />
      <rect x='25' y='4' width='14' height='13' rx='2' />
      <path d='M4 58 H60' />
    </>
  ),
  clock: () => (
    <>
      <circle cx='32' cy='33' r='23' />
      <path d='M32 18 V33 L42 39' />
      <path d='M26 5 H38 M32 5 V10' />
    </>
  ),
  dial: ({ share = 0.5 }) => {
    const a = Math.PI * (1 - Math.min(1, Math.max(0, share)));
    const x = 32 + 20 * Math.cos(a);
    const y = 44 - 20 * Math.sin(a);
    return (
      <>
        <path d='M6 44 A26 26 0 0 1 58 44' />
        <path d={`M32 44 L${x.toFixed(1)} ${y.toFixed(1)}`} />
        <circle cx='32' cy='44' r='3.6' style={dot} />
        <path d='M10 52 H54' />
      </>
    );
  },
};

const Sketch = ({ name, color, size = 56, glow = true, ...props }) => {
  const Drawing = DRAWINGS[name];
  if (!Drawing) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 64 64'
      aria-hidden
      style={{
        flex: 'none',
        color,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 3,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        overflow: 'visible',
        filter: glow ? `drop-shadow(0 0 5px ${color})` : undefined,
      }}
    >
      <g filter='url(#sketch-wobble)'>
        <Drawing {...props} />
      </g>
    </svg>
  );
};

export default Sketch;
