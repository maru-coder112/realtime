import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumShell from '../components/PremiumShell';
import api from '../services/api';
import '../styles/news.css';

// Fallback mock news data for when API is unavailable
const MOCK_NEWS = [
  {
    id: 1,
    title: 'Federal Reserve Pauses Rate Hikes Amid Banking Concerns',
    description: 'The Fed held rates steady at 5.25-5.50%, citing persistent inflation but acknowledging recent economic slowdown.',
    source: 'Reuters',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    category: 'Economy',
    impact: 'high',
    image: 'https://images.unsplash.com/photo-1611974234167-9b19e02f3d7c?auto=format&fit=crop&w=800&q=60',
    isFeatured: true,
    content: 'In a significant policy decision, the Federal Reserve decided to hold interest rates steady, marking a pause in its rate-hiking cycle. The decision reflects growing concerns about the stability of the banking sector and recent economic data showing signs of weakness.',
    relatedAssets: ['SPY', 'USDT', 'DXY'],
  },
  {
    id: 2,
    title: 'Bitcoin Surge: BTC Breaks $48,000 on Institutional Adoption',
    description: 'Bitcoin rallies 8% as major financial institutions announce increased allocation to digital assets.',
    source: 'Bloomberg',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    category: 'Crypto',
    impact: 'high',
    image: 'https://images.unsplash.com/photo-1639762681033-ec5c5fb92fac?auto=format&fit=crop&w=800&q=60',
    isFeatured: false,
    content: 'Bitcoin has surged past the $48,000 mark following announcements from several Fortune 500 companies about increased cryptocurrency exposure.',
    relatedAssets: ['BTC', 'ETH', 'CRYPTO'],
  },
  {
    id: 3,
    title: 'Nvidia Q3 Earnings Beat Expectations: AI Boom Continues',
    description: 'Nvidia stock rises 6% after delivering strong earnings driven by demand for AI accelerator chips.',
    source: 'MarketWatch',
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    category: 'AI & Technology',
    impact: 'high',
    image: 'https://images.unsplash.com/photo-1620712014386-76ac9e5f57eb?auto=format&fit=crop&w=800&q=60',
    isFeatured: false,
    content: 'Nvidia reported better-than-expected Q3 earnings, with revenue driven primarily by sales of data center GPUs for AI applications.',
    relatedAssets: ['NVDA', 'TECH', 'NASDAQ'],
  },
  {
    id: 4,
    title: 'EUR/USD Approaches 1.10: ECB Rate Signals Ahead',
    description: 'Euro strengthens against dollar as markets await ECB monetary policy signals next week.',
    source: 'FXStreet',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    category: 'Forex',
    impact: 'medium',
    image: 'https://images.unsplash.com/photo-1611987620712-640974588df4?auto=format&fit=crop&w=800&q=60',
    isFeatured: false,
    content: 'The Euro continues its recent strength against the US Dollar as traders anticipate the European Central Bank\'s next monetary policy decision.',
    relatedAssets: ['EURUSD', 'EUR', 'FOREX'],
  },
  {
    id: 5,
    title: 'S&P 500 Reaches New High: Tech Sector Leads Rally',
    description: 'The S&P 500 closes at a new 52-week high as technology stocks gain 3% on AI optimism.',
    source: 'CNBC',
    timestamp: new Date(Date.now() - 1000 * 60 * 150),
    category: 'Stocks',
    impact: 'medium',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=60',
    isFeatured: false,
    content: 'Major technology stocks led the market rally, with the Nasdaq climbing 3% as investors remained optimistic about AI growth prospects.',
    relatedAssets: ['SPY', 'QQQ', 'TECH'],
  },
  {
    id: 6,
    title: 'Oil Prices Decline on Demand Concerns',
    description: 'Crude oil falls 2.5% amid weakening global demand signals and increased supply from OPEC+ nations.',
    source: 'Energy Intelligence',
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    category: 'Economy',
    impact: 'medium',
    image: 'https://images.unsplash.com/photo-1629930023651-d5da1a1f4f3f?auto=format&fit=crop&w=800&q=60',
    isFeatured: false,
    content: 'Crude oil prices slid lower as market participants grew concerned about slowing global economic growth impacting energy demand.',
    relatedAssets: ['CL', 'XLE', 'ENERGY'],
  },
  {
    id: 7,
    title: 'Apple Announces New AR/VR Product Lineup',
    description: 'Apple unveils next-generation augmented reality devices, signaling major push into spatial computing.',
    source: 'Tech Insider',
    timestamp: new Date(Date.now() - 1000 * 60 * 210),
    category: 'AI & Technology',
    impact: 'medium',
    image: 'https://images.unsplash.com/photo-1606933248051-5ce98adc474e?auto=format&fit=crop&w=800&q=60',
    isFeatured: false,
    content: 'Apple has announced a new line of augmented reality and virtual reality products, marking its formal entry into the spatial computing market.',
    relatedAssets: ['AAPL', 'TECH', 'AR_VR'],
  },
  {
    id: 8,
    title: 'Ethereum Foundation Launches Security Upgrade',
    description: 'Ethereum network completes major security upgrade improving transaction validation and network efficiency.',
    source: 'Crypto News',
    timestamp: new Date(Date.now() - 1000 * 60 * 240),
    category: 'Crypto',
    impact: 'low',
    image: 'https://images.unsplash.com/photo-1621761191319-c6fb62b71c32?auto=format&fit=crop&w=800&q=60',
    isFeatured: false,
    content: 'Ethereum successfully rolled out a critical security upgrade that enhances the blockchain\'s validation mechanisms.',
    relatedAssets: ['ETH', 'CRYPTO', 'DEFI'],
  },
];

const CATEGORIES = ['All', 'Stocks', 'Crypto', 'Forex', 'Economy', 'AI & Technology'];
const DATE_FILTERS = [
  { label: 'Today', days: 1 },
  { label: 'This Week', days: 7 },
  { label: 'This Month', days: 30 },
];

export default function NewsPage() {
  const [newsData, setNewsData] = useState(MOCK_NEWS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNews, setSelectedNews] = useState(null);
  const [sortBy, setSortBy] = useState('latest');
  const [showHighImpactOnly, setShowHighImpactOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch news from API on component mount
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/market/news?limit=20');
        if (response?.news && Array.isArray(response.news)) {
          setNewsData(response.data?.news || MOCK_NEWS);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch news:', err);
        setError(err.message);
        // Keep using mock data on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchNews();
  }, []);

  // Filter and search logic
  const filteredNews = useMemo(() => {
    let result = newsData;

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter((news) => news.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (news) =>
          news.title.toLowerCase().includes(query) ||
          news.description.toLowerCase().includes(query) ||
          news.source.toLowerCase().includes(query)
      );
    }

    // Date filter
    if (selectedDateFilter) {
      const cutoffTime = Date.now() - selectedDateFilter.days * 24 * 60 * 60 * 1000;
      result = result.filter((news) => news.timestamp.getTime() > cutoffTime);
    }

    // Impact filter
    if (showHighImpactOnly) {
      result = result.filter((news) => news.impact === 'high');
    }

    // Sort
    if (sortBy === 'latest') {
      result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    return result;
  }, [selectedCategory, searchQuery, selectedDateFilter, showHighImpactOnly, sortBy, newsData]);

  const featuredNews = filteredNews.find((n) => n.isFeatured) || filteredNews[0];
  const newsToDisplay = featuredNews ? filteredNews.filter((n) => n.id !== featuredNews.id) : filteredNews;

  const formatTime = (date) => {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <PremiumShell title="Market News" subtitle="Latest financial and market updates">
      <motion.div
        className="news-page"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header Controls */}
        <div className="news-header-controls">
          <div className="news-search-wrapper">
            <input
              type="text"
              className="news-search-input"
              placeholder="Search news by title, source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg className="news-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>

          <div className="news-header-buttons">
            <button className="news-refresh-btn" title="Refresh news">
              ⟳
            </button>
            <span className="news-live-indicator">
              <span className="news-live-dot" />
              Live
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <motion.div
            className="news-loading-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="news-loading-spinner"></div>
            <p>Loading financial news...</p>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            className="news-error-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p>Using cached news data. Could not fetch latest updates.</p>
          </motion.div>
        )}

        {/* Category Filter */}
        <div className="news-category-filter">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              className={`news-category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        <div className="news-advanced-filters">
          <div className="news-filter-group">
            <label className="news-filter-label">Date Range:</label>
            <div className="news-date-filters">
              {DATE_FILTERS.map((filter) => (
                <button
                  key={filter.days}
                  className={`news-date-filter-btn ${selectedDateFilter?.days === filter.days ? 'active' : ''}`}
                  onClick={() => setSelectedDateFilter(selectedDateFilter?.days === filter.days ? null : filter)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="news-filter-group">
            <label className="news-filter-label">Sort:</label>
            <select
              className="news-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          <label className="news-filter-checkbox">
            <input
              type="checkbox"
              checked={showHighImpactOnly}
              onChange={(e) => setShowHighImpactOnly(e.target.checked)}
            />
            <span>High Impact Only</span>
          </label>
        </div>

        {/* Featured News */}
        {featuredNews && (
          <motion.div
            className="news-featured-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="news-featured-card">
              <div className="news-featured-image">
                <img src={featuredNews.image} alt={featuredNews.title} />
                <div className="news-featured-overlay">
                  <span className="news-featured-badge">Featured</span>
                </div>
              </div>

              <div className="news-featured-content">
                <div className="news-featured-header">
                  <div className="news-featured-meta">
                    <span className={`news-impact-badge impact-${featuredNews.impact}`}>
                      {featuredNews.impact.toUpperCase()}
                    </span>
                    <span className="news-featured-category">{featuredNews.category}</span>
                  </div>
                  <span className="news-featured-time">{formatTime(featuredNews.timestamp)}</span>
                </div>

                <h2 className="news-featured-title">{featuredNews.title}</h2>
                <p className="news-featured-description">{featuredNews.description}</p>

                <div className="news-featured-footer">
                  <span className="news-featured-source">{featuredNews.source}</span>
                  <button
                    className="news-read-more-btn"
                    onClick={() => setSelectedNews(featuredNews)}
                  >
                    Read Full Story
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* News Grid */}
        <div className="news-grid">
          <motion.div
            className="news-grid-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {newsToDisplay.length > 0 ? (
              newsToDisplay.map((news, index) => (
                <motion.article
                  key={news.id}
                  className="news-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  onClick={() => setSelectedNews(news)}
                >
                  <div className="news-card-image">
                    <img src={news.image} alt={news.title} />
                    <div className="news-card-overlay">
                      <button className="news-card-share-btn" title="Share" onClick={(e) => e.stopPropagation()}>
                        ↗
                      </button>
                    </div>
                  </div>

                  <div className="news-card-content">
                    <div className="news-card-meta">
                      <span className={`news-impact-badge impact-${news.impact}`}>
                        {news.impact === 'high' && '⚡'}
                        {news.impact === 'medium' && '●'}
                        {news.impact === 'low' && '○'}
                      </span>
                      <span className="news-card-category">{news.category}</span>
                      <span className="news-card-time">{formatTime(news.timestamp)}</span>
                    </div>

                    <h3 className="news-card-title">{news.title}</h3>
                    <p className="news-card-description">{news.description}</p>

                    <div className="news-card-footer">
                      <span className="news-card-source">{news.source}</span>
                      <button
                        className="news-card-save-btn"
                        title="Save article"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ★
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))
            ) : (
              <div className="news-empty-state">
                <p>No news found matching your filters.</p>
                <button
                  className="news-clear-filters-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setSelectedDateFilter(null);
                    setShowHighImpactOnly(false);
                  }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* News Detail Modal */}
        <AnimatePresence>
          {selectedNews && (
            <motion.div
              className="news-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNews(null)}
            >
              <motion.div
                className="news-modal"
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="news-modal-close"
                  onClick={() => setSelectedNews(null)}
                  aria-label="Close"
                >
                  ✕
                </button>

                <div className="news-modal-image">
                  <img src={selectedNews.image} alt={selectedNews.title} />
                </div>

                <div className="news-modal-content">
                  <div className="news-modal-header">
                    <div className="news-modal-badges">
                      <span className={`news-impact-badge impact-${selectedNews.impact}`}>
                        {selectedNews.impact.toUpperCase()} IMPACT
                      </span>
                      <span className="news-modal-category">{selectedNews.category}</span>
                    </div>
                    <span className="news-modal-time">{selectedNews.timestamp.toLocaleString()}</span>
                  </div>

                  <h1 className="news-modal-title">{selectedNews.title}</h1>

                  <div className="news-modal-source">
                    <span>Published by</span>
                    <strong>{selectedNews.source}</strong>
                  </div>

                  <div className="news-modal-body">
                    <p>{selectedNews.content}</p>
                  </div>

                  {selectedNews.relatedAssets && selectedNews.relatedAssets.length > 0 && (
                    <div className="news-modal-assets">
                      <h3>Related Assets</h3>
                      <div className="news-modal-assets-list">
                        {selectedNews.relatedAssets.map((asset) => (
                          <span key={asset} className="news-modal-asset-tag">
                            {asset}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="news-modal-actions">
                    <button className="news-modal-save-btn">★ Save Article</button>
                    <button className="news-modal-share-btn">↗ Share</button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </PremiumShell>
  );
}
