import React from 'react';

// The original Liberator artwork, recoloured into the broadcast palette
// (cyan wing, yellow ₿, neon pink outline and wordmark) and cropped to its
// content. The untouched original is the_liberator_horizontal.png.
const SRC = '/assets/the_liberator_neon.png';
const ASPECT = 900 / 338;

const Logo = ({ height = 98 }) => (
  <img
    src={SRC}
    alt='The Liberator'
    height={height}
    width={Math.round(height * ASPECT)}
    style={{ display: 'block' }}
  />
);

export default Logo;
