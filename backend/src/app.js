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
const Scheduler = require('./services/scheduler');

const app = new Koa();
const router = new Router();

// Initialize scheduler
const scheduler = new Scheduler();

// Middleware
app.use(cors());
app.use(bodyParser());
// Only use logger in development to avoid the generator deprecation warning
if (process.env.NODE_ENV !== 'production') {
  app.use(logger());
}

// Serve static files from React build
const frontendPath = path.join(__dirname, '../../frontend/build');
app.use(serve(frontendPath));

// API Routes
router.get('/api/health', (ctx) => {
  ctx.body = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    architecture: 'multi-source-api',
  };
});

// Enhanced monitoring endpoint
router.get('/api/stats', (ctx) => {
  ctx.body = scheduler.getStats();
});

// Cache data endpoint for debugging
router.get('/api/cache', (ctx) => {
  ctx.body = scheduler.getCurrentCacheData();
});

// API health endpoint
router.get('/api/adapters', (ctx) => {
  const stats = scheduler.getStats();
  ctx.body = stats.apiManager;
});

// Memory cleanup endpoint (for admin use)
router.post('/api/admin/cleanup', (ctx) => {
  scheduler.forceMemoryCleanup();
  ctx.body = {
    status: 'cleanup_completed',
    timestamp: new Date().toISOString(),
  };
});

// Memory usage endpoint
router.get('/api/memory', (ctx) => {
  ctx.body = {
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
    platform: process.platform,
    nodeVersion: process.version,
    pid: process.pid,
  };
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

// Start server with resilient architecture
(async () => {
  try {
    console.log(
      '🚀 Starting Bitcoin Dashboard with Multi-Source API Architecture...'
    );

    // Initialize WebSocket server
    websocketServer.init(server);

    // Start scheduler
    scheduler.start();

    server.listen(PORT, () => {
      console.log(`🚀 Bitcoin Dashboard running on port ${PORT}`);
      console.log(
        `📊 Enhanced monitoring available at http://localhost:${PORT}/api/stats`
      );
      console.log(`🔧 Memory usage at http://localhost:${PORT}/api/memory`);
      console.log(`🏥 API health at http://localhost:${PORT}/api/adapters`);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      scheduler.stop();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      scheduler.stop();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
