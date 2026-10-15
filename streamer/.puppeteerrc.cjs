const { join } = require('path');

// Keep Puppeteer's pinned Chrome inside the project rather than ~/.cache, so
// it never auto-updates and goes away with the checkout.
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
