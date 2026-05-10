import { useState } from 'react';
import { motion } from 'framer-motion';
import AIPredictionWidget from '../components/AIPredictionWidget';
import DashboardNews from '../components/DashboardNews';
import MarketChart from '../components/MarketChart';
import MarketOverviewPanel from '../components/MarketOverviewPanel';
import PremiumShell from '../components/PremiumShell';
import { MARKET_SYMBOLS } from '../constants/markets';

export default function DashboardPage() {
  const [selectedSymbol, setSelectedSymbol] = useState(MARKET_SYMBOLS[0].value);

  return (
    <PremiumShell
      title="Realtime Trading Desk"
      subtitle="Premium market overview, live charting, and AI signal context in one terminal."
    >
      <motion.section className="hero-strip full-width" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card hero-card">
          <p className="kicker">Institutional Intelligence</p>
          <h2>Track volatility, execution, and macro context from a single command center.</h2>
          <p className="muted">
            Built for serious traders who need fast market structure, clear risk cues, and a clean premium interface.
          </p>
          <div className="hero-metrics">
            <span>Live candles</span>
            <span>AI signals</span>
            <span>Market breadth</span>
            <span>Breaking news</span>
          </div>
        </div>
      </motion.section>

      <div className="dashboard-top full-width">
        <MarketChart selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />
      </div>

      <div className="dashboard-grid full-width">
        <MarketOverviewPanel selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} />
        <AIPredictionWidget selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />
      </div>

      <DashboardNews limit={8} showMoreLink />
    </PremiumShell>
  );
}
