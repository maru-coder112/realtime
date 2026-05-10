import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import SideNav from './SideNav';
import TopNav from './TopNav';
import TradingBackground from './TradingBackground';

export default function PremiumShell({ title, subtitle, className = '', children }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1100;
  });

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1100);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`premium-shell ${className}`.trim()}>
      <TradingBackground />
      <SideNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="premium-shell-main">
        <TopNav
          title={title}
          subtitle={subtitle}
          className="premium-topbar"
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          menuOpen={sidebarOpen}
        />

        <motion.main
          className="premium-shell-content"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
