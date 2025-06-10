require('dotenv').config();
const Koa = require('koa');
const Router = require('koa-router');
const cors = require('koa-cors');
const bodyParser = require('koa-bodyparser');
const logger = require('koa-logger');
const http = require('http');

const bitcoinRoutes = require('./routes/bitcoin');
const websocketServer = require('./websocket/server');
const scheduler = require('./utils/scheduler');

const app = new Koa();
const router = new Router();

// Middleware
app.use(cors());
app.use(bodyParser());
app.use(logger());

// Routes
router.use('/api', bitcoinRoutes.routes());
app.use(router.routes());
app.use(router.allowedMethods());

// Health check
router.get('/health', (ctx) => {
  ctx.body = { status: 'OK', timestamp: new Date().toISOString() };
});

const PORT = process.env.PORT || 3001;
const server = http.createServer(app.callback());

// Initialize WebSocket server
websocketServer.init(server);

// Start scheduler for periodic data updates
scheduler.start();

server.listen(PORT, () => {
  console.log(`🚀 Bitcoin Dashboard Backend running on port ${PORT}`);
});
