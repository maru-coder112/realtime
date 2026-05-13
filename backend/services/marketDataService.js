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

function stripHtml(input = '') {
  return String(input)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFirstImageFromHtml(html = '') {
  const match = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || null;
}

function parseRssTag(block, tag) {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const cdataRegex = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const cdata = block.match(cdataRegex);
  if (cdata?.[1]) return cdata[1].trim();
  const plain = block.match(regex);
  return plain?.[1]?.trim() || '';
}

function parseRssFeed(xml = '', source = 'RSS', maxItems = 20) {
  const items = String(xml).match(/<item>[\s\S]*?<\/item>/gi) || [];

  return items.slice(0, maxItems).map((item, index) => {
    const title = stripHtml(parseRssTag(item, 'title')) || `${source} update`;
    const link = stripHtml(parseRssTag(item, 'link')) || '#';
    const descriptionRaw = parseRssTag(item, 'description') || parseRssTag(item, 'content:encoded') || '';
    const descriptionText = stripHtml(descriptionRaw);
    const pubDateRaw = stripHtml(parseRssTag(item, 'pubDate'));
    const publishedDate = Number.isNaN(new Date(pubDateRaw).getTime()) ? new Date() : new Date(pubDateRaw);
    const category = categorizeNews('', `${title} ${descriptionText}`);

    return {
      id: `rss-${source.toLowerCase().replace(/\s+/g, '-')}-${index}-${publishedDate.getTime()}`,
      title,
      description: descriptionText.slice(0, 180) + (descriptionText.length > 180 ? '...' : ''),
      summary: descriptionText.slice(0, 180) + (descriptionText.length > 180 ? '...' : ''),
      content: descriptionText || title,
      source,
      timestamp: publishedDate.toISOString(),
      publishedAt: publishedDate.toISOString(),
      category,
      impact: determineImpact(title, descriptionText),
      image: extractFirstImageFromHtml(descriptionRaw) || getNewsImage(category),
      isFeatured: false,
      relatedAssets: extractAssets(title),
      url: link,
    };
  });
}

function buildFallbackNews(count = 12) {
  const templates = [
    { title: 'Bitcoin market update: momentum remains strong', source: 'Fallback Wire', category: 'Crypto' },
    { title: 'Ethereum ecosystem growth accelerates across DeFi', source: 'Fallback Wire', category: 'Crypto' },
    { title: 'Altcoin rotation pushes SOL and AVAX higher', source: 'Fallback Wire', category: 'Crypto' },
    { title: 'Stablecoin regulation talks impact market sentiment', source: 'Fallback Wire', category: 'Economy' },
    { title: 'Crypto miners adapt to shifting hash rate economics', source: 'Fallback Wire', category: 'Economy' },
    { title: 'Institutional desks increase BTC and ETH exposure', source: 'Fallback Wire', category: 'Crypto' },
    { title: 'AI token basket outperforms broader crypto market', source: 'Fallback Wire', category: 'AI & Technology' },
    { title: 'Macro data release drives volatility in crypto pairs', source: 'Fallback Wire', category: 'Economy' },
    { title: 'On-chain activity rises as network fees normalize', source: 'Fallback Wire', category: 'Crypto' },
    { title: 'Derivatives open interest signals risk-on appetite', source: 'Fallback Wire', category: 'Crypto' },
    { title: 'Layer-2 ecosystems attract new developer flows', source: 'Fallback Wire', category: 'AI & Technology' },
    { title: 'Forex and crypto correlation weakens this session', source: 'Fallback Wire', category: 'Forex' },
  ];

  return Array.from({ length: count }).map((_, index) => {
    const base = templates[index % templates.length];
    const timestamp = new Date(Date.now() - index * 1000 * 60 * 25).toISOString();
    return {
      id: `fallback-${index + 1}`,
      title: base.title,
      description: `${base.title}. Traders are monitoring liquidity, macro signals, and exchange flows for confirmation.`,
      summary: `${base.title}. Traders are monitoring liquidity, macro signals, and exchange flows for confirmation.`,
      content: `${base.title}. This is a fallback article generated when external feeds are unavailable. It preserves full page behavior with realistic crypto market context.`,
      source: base.source,
      timestamp,
      publishedAt: timestamp,
      category: base.category,
      impact: index < 4 ? 'high' : index < 8 ? 'medium' : 'low',
      image: getNewsImage(base.category),
      isFeatured: index === 0,
      relatedAssets: ['BTC', 'ETH', 'SOL'],
      url: '#',
    };
  });
}

async function fetchCryptoNews(limit = 8) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  try {
    const response = await axios.get('https://min-api.cryptocompare.com/data/v2/news/', {
      params: { lang: 'EN' },
      timeout: 5000,
    });

    const cryptoCompareItems = Array.isArray(response.data?.Data) ? response.data.Data : [];
    const cryptoCompareNews = cryptoCompareItems.slice(0, safeLimit).map((item, index) => {
      const tags = item.tags || '';
      const category = categorizeNews(tags, item.title);
      const impact = determineImpact(item.title, item.body);
      const assets = extractAssets(tags);
      
      return {
        id: item.id || `news-${index}`,
        title: item.title,
        description: item.body.substring(0, 150) + (item.body.length > 150 ? '...' : ''),
        summary: item.body.substring(0, 150) + (item.body.length > 150 ? '...' : ''),
        content: item.body,
        source: item.source || 'Crypto News',
        timestamp: item.published_on ? new Date(item.published_on * 1000).toISOString() : new Date().toISOString(),
        publishedAt: item.published_on ? new Date(item.published_on * 1000).toISOString() : new Date().toISOString(),
        category,
        impact,
        image: item.imageurl || getNewsImage(category),
        isFeatured: false,
        relatedAssets: assets,
        url: item.url,
      };
    });

    const rssSources = [
      { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk' },
      { url: 'https://cointelegraph.com/rss', source: 'Cointelegraph' },
      { url: 'https://decrypt.co/feed', source: 'Decrypt' },
    ];

    const rssResults = await Promise.allSettled(
      rssSources.map((feed) =>
        axios.get(feed.url, { timeout: 7000 }).then((res) => parseRssFeed(res.data, feed.source, Math.max(10, safeLimit)))
      )
    );

    const rssNews = rssResults
      .filter((result) => result.status === 'fulfilled')
      .flatMap((result) => result.value);

    const deduped = [];
    const seen = new Set();
    for (const item of [...cryptoCompareNews, ...rssNews]) {
      const key = `${item.url || ''}|${item.title || ''}`.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    const news = deduped
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, safeLimit)
      .map((item, index) => ({
        ...item,
        image: item.image || getNewsImage(item.category || 'Crypto'),
        isFeatured: index === 0,
      }));

    if (!news.length) {
      return {
        source: 'fallback',
        timestamp: new Date().toISOString(),
        news: buildFallbackNews(Math.max(12, safeLimit)),
      };
    }

    return {
      source: 'aggregated',
      timestamp: new Date().toISOString(),
      news,
    };
  } catch (error) {
    console.error('Error fetching crypto news:', error.message);
    return {
      source: 'fallback',
      timestamp: new Date().toISOString(),
      news: buildFallbackNews(Math.max(12, safeLimit)),
    };
  }
}

module.exports = {
  fetchLivePrices,
  fetchMarketHistory,
  fetchMarketSummary,
  fetchCryptoNews,
};
