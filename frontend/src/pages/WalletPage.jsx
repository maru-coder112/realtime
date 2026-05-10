import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PremiumShell from '../components/PremiumShell';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function WalletPage() {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState(user?.virtualBalance || 10000);
  const [portfolio, setPortfolio] = useState({ holdings: [] });

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const { data } = await api.get('/api/portfolio/default');
        setPortfolio(data || { holdings: [] });
      } catch {
        setPortfolio({ holdings: [] });
      }
    };

    loadPortfolio();
  }, []);

  const currentHoldings = portfolio.holdings || [];

  return (
    <PremiumShell title="Virtual Wallet" subtitle="Manage your trading balance and current holdings">
      <div className="wallet-page">
        {/* Wallet Balance Summary */}
        <motion.section
          className="wallet-card card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className="wallet-header">
            <div>
              <p className="kicker">Wallet Balance</p>
              <h2>Virtual Trading Account</h2>
            </div>
          </div>
          <div className="wallet-display">
            <p className="wallet-label">Current Balance</p>
            <p className="wallet-amount">${walletBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
            <p className="wallet-currency">USD</p>
          </div>
        </motion.section>

        {/* Current Holdings */}
        <motion.section
          className="wallet-card card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.06 }}
        >
          <div className="wallet-header">
            <div>
              <p className="kicker">Holdings</p>
              <h2>Current holdings</h2>
            </div>
          </div>
          <div className="holdings-list">
            {currentHoldings.length ? (
              currentHoldings.map((holding) => {
                const currentPrice = Number(holding.currentPrice || 0);
                const holdingValue = Number(holding.amount || 0) * currentPrice;

                return (
                  <div key={holding.symbol} className="holding-item">
                    <div className="holding-left">
                      <p className="holding-symbol">{holding.symbol}</p>
                      <p className="holding-amount">{holding.amount} units</p>
                    </div>
                    <div className="holding-right">
                      <p className="holding-price">${currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                      <p className="holding-value">${holdingValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="muted">No current holdings.</p>
            )}
          </div>
        </motion.section>

        {/* Account Info */}
        <motion.section
          className="wallet-card card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.1 }}
        >
          <div className="wallet-header">
            <div>
              <p className="kicker">Account Information</p>
              <h2>Virtual wallet details</h2>
            </div>
          </div>
          <div className="account-details">
            <div className="detail-row">
              <span className="detail-label">Account holder</span>
              <span className="detail-value">{user?.fullName || user?.username || 'Trader'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Account type</span>
              <span className="detail-value">Virtual Trading Account</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Currency</span>
              <span className="detail-value">USD</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="detail-value active">Active</span>
            </div>
          </div>
        </motion.section>
      </div>
    </PremiumShell>
  );
}
