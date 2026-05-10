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

// Map categories based on news content
function categorizeNews(tags = '', title = '') {
  const content = `${tags} ${title}`.toLowerCase();
  
  if (content.includes('btc') || content.includes('eth') || content.includes('crypto') || content.includes('bitcoin') || content.includes('ethereum')) {
    return 'Crypto';
  }
  if (content.includes('stock') || content.includes('sp500') || content.includes('nasdaq') || content.includes('dow')) {
    return 'Stocks';
  }
  if (content.includes('forex') || content.includes('eurusd') || content.includes('gbpusd') || content.includes('yen')) {
    return 'Forex';
  }
  if (content.includes('fed') || content.includes('inflation') || content.includes('rate') || content.includes('economy') || content.includes('gdp')) {
    return 'Economy';
  }
  if (content.includes('ai') || content.includes('tech') || content.includes('nvidia') || content.includes('apple') || content.includes('microsoft')) {
    return 'AI & Technology';
  }
  return 'Crypto'; // Default to Crypto
}

// Determine impact level based on keywords
function determineImpact(title = '', summary = '') {
  const content = `${title} ${summary}`.toLowerCase();
  
  const highImpactKeywords = ['surge', 'soars', 'plunges', 'crashes', 'breaks', 'major', 'critical', 'emergency', 'halted', 'significant'];
  const mediumImpactKeywords = ['rises', 'falls', 'moves', 'shifts', 'signal', 'update', 'change', 'gains', 'loses'];
  
  if (highImpactKeywords.some(keyword => content.includes(keyword))) {
    return 'high';
  }
  if (mediumImpactKeywords.some(keyword => content.includes(keyword))) {
    return 'medium';
  }
  return 'low';
}

// Get image URL for news - using placeholder from Unsplash for now
function getNewsImage(tags = '') {
  const category = categorizeNews(tags);
  const images = {
    'Crypto': 'https://images.unsplash.com/photo-1639762681033-ec5c5fb92fac?auto=format&fit=crop&w=800&q=60',
    'Stocks': 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=60',
    'Forex': 'https://images.unsplash.com/photo-1611987620712-640974588df4?auto=format&fit=crop&w=800&q=60',
    'Economy': 'https://images.unsplash.com/photo-1611974234167-9b19e02f3d7c?auto=format&fit=crop&w=800&q=60',
    'AI & Technology': 'https://images.unsplash.com/photo-1620712014386-76ac9e5f57eb?auto=format&fit=crop&w=800&q=60',
  };
  return images[category];
}

// Parse tags to extract related assets
function extractAssets(tags = '') {
  const tagArray = tags.split(',').filter(t => t.trim());
  return tagArray.slice(0, 5).map(t => t.trim().toUpperCase());
}

async function fetchCryptoNews(limit = 8) {
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 50);
  try {
    const response = await axios.get('https://min-api.cryptocompare.com/data/v2/news/', {
      params: { lang: 'EN' },
      timeout: 5000,
    });

    const news = (response.data?.Data || []).slice(0, safeLimit).map((item, index) => {
      const tags = item.tags || '';
      const category = categorizeNews(tags, item.title);
      const impact = determineImpact(item.title, item.body);
      const assets = extractAssets(tags);
      
      return {
        id: item.id || `news-${index}`,
        title: item.title,
        description: item.body.substring(0, 150) + (item.body.length > 150 ? '...' : ''),
        content: item.body,
        source: item.source || 'Crypto News',
        timestamp: item.published_on ? new Date(item.published_on * 1000) : new Date(),
        category,
        impact,
        image: item.imageurl || getNewsImage(tags),
        isFeatured: index === 0,
        relatedAssets: assets,
        url: item.url,
      };
    });

    return {
      source: 'cryptocompare',
      timestamp: new Date().toISOString(),
      news,
    };
  } catch (error) {
    console.error('Error fetching crypto news:', error.message);
    // Fallback to mock data
    return {
      source: 'mock',
      timestamp: new Date().toISOString(),
      news: [
        {
          id: 'mock-1',
          title: 'Bitcoin Surge: BTC Breaks $48,000 on Institutional Adoption',
          description: 'Bitcoin rallies 8% as major financial institutions announce increased allocation to digital assets.',
          content: 'Bitcoin has surged past the $48,000 mark following announcements from several Fortune 500 companies about increased cryptocurrency exposure. Major institutional players including pension funds and asset managers are allocating significant capital to digital assets.',
          source: 'Bloomberg',
          timestamp: new Date(Date.now() - 1000 * 60 * 45),
          category: 'Crypto',
          impact: 'high',
          image: 'https://images.unsplash.com/photo-1639762681033-ec5c5fb92fac?auto=format&fit=crop&w=800&q=60',
          isFeatured: true,
          relatedAssets: ['BTC', 'ETH', 'CRYPTO'],
          url: '#',
        },
        {
          id: 'mock-2',
          title: 'Ethereum Foundation Launches Security Upgrade',
          description: 'Ethereum network completes major security upgrade improving transaction validation and network efficiency.',
          content: 'Ethereum successfully rolled out a critical security upgrade that enhances the blockchain\'s validation mechanisms. The upgrade improves transaction throughput by 30% and reduces network congestion during peak hours.',
          source: 'Crypto News',
          timestamp: new Date(Date.now() - 1000 * 60 * 120),
          category: 'Crypto',
          impact: 'high',
          image: 'https://images.unsplash.com/photo-1621761191319-c6fb62b71c32?auto=format&fit=crop&w=800&q=60',
          isFeatured: false,
          relatedAssets: ['ETH', 'DEFI'],
          url: '#',
        },
        {
          id: 'mock-3',
          title: 'Federal Reserve Pauses Rate Hikes',
          description: 'The Fed held rates steady at 5.25-5.50%, citing persistent inflation but acknowledging economic slowdown.',
          content: 'In a significant policy decision, the Federal Reserve decided to hold interest rates steady, marking a pause in its rate-hiking cycle. The decision reflects growing concerns about the stability of the banking sector and recent economic data showing signs of weakness.',
          source: 'Reuters',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          category: 'Economy',
          impact: 'high',
          image: 'https://images.unsplash.com/photo-1611974234167-9b19e02f3d7c?auto=format&fit=crop&w=800&q=60',
          isFeatured: false,
          relatedAssets: ['SPY', 'DXY'],
          url: '#',
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
