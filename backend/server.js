require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { setupMarketSocket } = require('./websocket/marketSocket');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
  },
  path: '/ws/market',
});

setupMarketSocket(io);

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
