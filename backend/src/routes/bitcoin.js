const Router = require('koa-router');
const router = new Router();

// Placeholder for Bitcoin routes
router.get('/bitcoin/candles/:timeframe', async (ctx) => {
  ctx.body = { message: 'Bitcoin candles endpoint - Coming soon!' };
});

module.exports = router;
