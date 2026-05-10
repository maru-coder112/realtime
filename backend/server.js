require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { setupMarketSocket } = require('./websocket/marketSocket');
const ensureSchema = require('./utils/ensureSchema');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
  },
  path: '/ws/market',
});

setupMarketSocket(io);

async function bootstrap() {
  try {
    await ensureSchema();
    server.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to bootstrap server:', error.message);
    process.exit(1);
  }
}

bootstrap();
