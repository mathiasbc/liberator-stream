require('dotenv').config();
const Koa = require('koa');
const Router = require('koa-router');
const cors = require('koa-cors');
const bodyParser = require('koa-bodyparser');
const logger = require('koa-logger');
const http = require('http');

const websocketServer = require('./websocket/server');
const scheduler = require('./utils/scheduler');

const app = new Koa();
const router = new Router();

// Middleware
app.use(cors());
app.use(bodyParser());
app.use(logger());

// Routes
app.use(router.routes());
app.use(router.allowedMethods());

// Health check
router.get('/health', (ctx) => {
  ctx.body = { status: 'OK', timestamp: new Date().toISOString() };
});

const PORT = process.env.PORT;
if (!PORT) throw new Error('PORT must be set in .env');
const server = http.createServer(app.callback());

// Start server with initial data fetch
(async () => {
  try {
    console.log('Fetching initial data...');
    await scheduler.updateInitialData();
    console.log('Initial data loaded');

    // Initialize WebSocket server
    websocketServer.init(server);

    // Start scheduler for periodic data updates
    scheduler.start();

    server.listen(PORT, () => {
      console.log(`🚀 Bitcoin Dashboard Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
