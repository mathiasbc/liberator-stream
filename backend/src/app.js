require('dotenv').config();
const Koa = require('koa');
const Router = require('koa-router');
const cors = require('koa-cors');
const bodyParser = require('koa-bodyparser');
const logger = require('koa-logger');
const serve = require('koa-static');
const send = require('koa-send');
const path = require('path');
const http = require('http');

const websocketServer = require('./websocket/server');
const scheduler = require('./utils/scheduler');

const app = new Koa();
const router = new Router();

// Middleware
app.use(cors());
app.use(bodyParser());
app.use(logger());

// Serve static files from React build
const frontendPath = path.join(__dirname, '../../frontend/build');
app.use(serve(frontendPath));

// API Routes
router.get('/api/health', (ctx) => {
  ctx.body = { status: 'OK', timestamp: new Date().toISOString() };
});

app.use(router.routes());
app.use(router.allowedMethods());

// Catch-all handler: send back React's index.html file for any non-API routes
app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/api/') || ctx.path.startsWith('/ws')) {
    await next();
  } else {
    try {
      await send(ctx, 'index.html', { root: frontendPath });
    } catch (error) {
      console.error('Error sending index.html:', error);
      ctx.status = 404;
      ctx.body = 'Not Found';
    }
  }
});

const PORT = process.env.PORT || 3001;
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
      console.log(`🚀 Bitcoin Dashboard running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
