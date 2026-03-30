const { fetchLivePrices } = require('../services/marketDataService');

function setupMarketSocket(io) {
  io.on('connection', (socket) => {
    socket.emit('market:status', { message: 'Connected to real-time market feed' });
  });

  setInterval(async () => {
    const data = await fetchLivePrices();
    io.emit('market:ticker', data);
  }, 2000);
}

module.exports = {
  setupMarketSocket,
};
