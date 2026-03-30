import { useState } from 'react';
import AIPredictionWidget from '../components/AIPredictionWidget';
import MarketChart from '../components/MarketChart';
import TopNav from '../components/TopNav';
import TradingBackground from '../components/TradingBackground';
import { MARKET_SYMBOLS } from '../constants/markets';

export default function AIPredictionPage() {
  const [selectedSymbol, setSelectedSymbol] = useState(MARKET_SYMBOLS[0].value);

  return (
    <div className="layout dashboard-layout ai-page-layout">
      <TradingBackground />
      <TopNav
        title="AI Prediction Center"
        subtitle="Analyze market trend, risk level, and actionable recommendation for each symbol."
        className="terminal-nav"
      />

      <div className="dashboard-top full-width">
        <MarketChart selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />
      </div>

      <div className="full-width">
        <AIPredictionWidget selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />
      </div>
    </div>
  );
}
