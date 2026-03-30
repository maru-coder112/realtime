import { useState } from 'react';
import AIPredictionWidget from '../components/AIPredictionWidget';
import DashboardNews from '../components/DashboardNews';
import MarketChart from '../components/MarketChart';
import MarketOverviewPanel from '../components/MarketOverviewPanel';
import TopNav from '../components/TopNav';
import TradingBackground from '../components/TradingBackground';
import { MARKET_SYMBOLS } from '../constants/markets';

export default function DashboardPage() {
  const [selectedSymbol, setSelectedSymbol] = useState(MARKET_SYMBOLS[0].value);

  return (
    <div className="layout dashboard-layout">
      <TradingBackground />
      <TopNav
        title="Realtime Trading Desk"
        subtitle="Pro terminal view with market overview, charting, and AI signal context."
        className="terminal-nav"
      />

      <div className="dashboard-top full-width">
        <MarketChart selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />
      </div>

      <div className="dashboard-grid full-width">
        <MarketOverviewPanel selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} />
        <AIPredictionWidget selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />
      </div>

      <DashboardNews limit={8} showMoreLink />
    </div>
  );
}
