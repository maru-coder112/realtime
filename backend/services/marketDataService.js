const axios = require('axios');

const DASHBOARD_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
  'MATICUSDT',
  'LTCUSDT',
];

let mockPrices = {
  BTCUSDT: 60000,
  ETHUSDT: 3000,
};

function randomWalkPrice(price, maxMovePercent = 0.01) {
  const move = (Math.random() * 2 - 1) * maxMovePercent;
  return price * (1 + move);
}

function intervalToMs(interval) {
  const mapping = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };

  return mapping[interval] || mapping['1h'];
}

function generateMockHistory({ symbol, interval, limit }) {
  const startPrice = symbol === 'ETHUSDT' ? mockPrices.ETHUSDT : mockPrices.BTCUSDT;
  const stepMs = intervalToMs(interval);
  let lastClose = startPrice;

  const candles = [];
  for (let i = limit - 1; i >= 0; i -= 1) {
    const openTime = Date.now() - i * stepMs;
    const open = lastClose;
    const close = randomWalkPrice(open, 0.012);
    const high = Math.max(open, close) * (1 + Math.random() * 0.006);
    const low = Math.min(open, close) * (1 - Math.random() * 0.006);
    const volume = 100 + Math.random() * 500;

    lastClose = close;

    candles.push({
      openTime,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return candles;
}

function getMockBasePrice(symbol) {
  const known = {
    BTCUSDT: 60000,
    ETHUSDT: 3000,
    BNBUSDT: 550,
    SOLUSDT: 170,
    XRPUSDT: 0.6,
    ADAUSDT: 0.7,
    DOGEUSDT: 0.18,
    AVAXUSDT: 42,
    MATICUSDT: 0.9,
    LTCUSDT: 88,
  };

  return known[symbol] || 100;
}

async function fetchLivePrices() {
  try {
    const [btc, eth] = await Promise.all([
      axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'),
      axios.get('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT'),
    ]);

    return {
      BTCUSDT: Number(btc.data.price),
      ETHUSDT: Number(eth.data.price),
      source: 'binance',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    mockPrices = {
      BTCUSDT: randomWalkPrice(mockPrices.BTCUSDT),
      ETHUSDT: randomWalkPrice(mockPrices.ETHUSDT),
    };

    return {
      ...mockPrices,
      source: 'mock',
      timestamp: new Date().toISOString(),
    };
  }
}

async function fetchMarketHistory({ symbol = 'BTCUSDT', interval = '1h', limit = 120 }) {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/klines', {
      params: {
        symbol,
        interval,
        limit,
      },
    });

    return response.data.map((kline) => ({
      openTime: Number(kline[0]),
      open: Number(kline[1]),
      high: Number(kline[2]),
      low: Number(kline[3]),
      close: Number(kline[4]),
      volume: Number(kline[5]),
    }));
  } catch (error) {
    return generateMockHistory({ symbol, interval, limit });
  }
}

async function fetchMarketSummary() {
  try {
    const responses = await Promise.all(
      DASHBOARD_SYMBOLS.map((symbol) =>
        axios.get('https://api.binance.com/api/v3/ticker/24hr', { params: { symbol } })
      )
    );

    return {
      source: 'binance',
      timestamp: new Date().toISOString(),
      assets: responses.map((res) => ({
        symbol: res.data.symbol,
        lastPrice: Number(res.data.lastPrice),
        priceChangePercent: Number(res.data.priceChangePercent),
        highPrice: Number(res.data.highPrice),
        lowPrice: Number(res.data.lowPrice),
        quoteVolume: Number(res.data.quoteVolume),
      })),
    };
  } catch (error) {
    const assets = DASHBOARD_SYMBOLS.map((symbol) => {
      const base = mockPrices[symbol] || getMockBasePrice(symbol);
      const nextPrice = randomWalkPrice(base, 0.02);
      mockPrices[symbol] = nextPrice;
      const pct = ((nextPrice - base) / base) * 100;

      return {
        symbol,
        lastPrice: Number(nextPrice.toFixed(4)),
        priceChangePercent: Number(pct.toFixed(2)),
        highPrice: Number((Math.max(base, nextPrice) * 1.01).toFixed(4)),
        lowPrice: Number((Math.min(base, nextPrice) * 0.99).toFixed(4)),
        quoteVolume: Number((1000000 + Math.random() * 6000000).toFixed(0)),
      };
    });

    return {
      source: 'mock',
      timestamp: new Date().toISOString(),
      assets,
    };
  }
}

async function fetchCryptoNews(limit = 8) {
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 40);
  try {
    const response = await axios.get('https://min-api.cryptocompare.com/data/v2/news/', {
      params: { lang: 'EN' },
    });

    const news = (response.data?.Data || []).slice(0, safeLimit).map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.body,
      url: item.url,
      source: item.source,
      imageUrl: item.imageurl,
      publishedAt: item.published_on ? new Date(item.published_on * 1000).toISOString() : null,
      tags: item.tags || '',
    }));

    return {
      source: 'cryptocompare',
      timestamp: new Date().toISOString(),
      news,
    };
  } catch (error) {
    return {
      source: 'mock',
      timestamp: new Date().toISOString(),
      news: [
        {
          id: 'mock-1',
          title: 'Bitcoin sees steady bids as traders position for volatility.',
          summary: 'Market participants are balancing risk as derivatives open interest rises around major crypto pairs.',
          url: 'https://www.binance.com/en/markets',
          source: 'Market Desk',
          imageUrl: null,
          publishedAt: new Date().toISOString(),
          tags: 'BTC,Volatility',
        },
        {
          id: 'mock-2',
          title: 'Ethereum and Layer-1 tokens outperform in risk-on sessions.',
          summary: 'ETH, SOL, and AVAX are leading relative strength while traders monitor macro data and ETF flow updates.',
          url: 'https://www.binance.com/en/markets/overview',
          source: 'Crypto Wire',
          imageUrl: null,
          publishedAt: new Date().toISOString(),
          tags: 'ETH,SOL,AVAX',
        },
        {
          id: 'mock-3',
          title: 'Altcoin breadth improves as market rotates into mid-cap assets.',
          summary: 'Risk appetite is broadening while traders monitor BTC dominance for follow-through confirmation.',
          url: 'https://www.binance.com/en/markets/trading_data',
          source: 'Alpha Stream',
          imageUrl: null,
          publishedAt: new Date().toISOString(),
          tags: 'ALT,BREADTH',
        },
      ],
    };
  }
}

module.exports = {
  fetchLivePrices,
  fetchMarketHistory,
  fetchMarketSummary,
  fetchCryptoNews,
};
