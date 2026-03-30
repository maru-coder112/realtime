import { useTheme } from '../context/ThemeContext';

export default function GlobalLightBackground() {
  const { isDark } = useTheme();

  if (isDark) return null;

  return (
    <div className="global-light-bg" aria-hidden="true">
      <video
        className="global-light-bg-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src="https://cdn.coverr.co/videos/coverr-stock-market-1579/1080p.mp4" type="video/mp4" />
      </video>
      <div className="global-light-bg-overlay" />
      <div className="global-light-bg-grid" />
      <div className="global-light-bg-ticker">
        <span>
          USD/EUR +0.12%   USD/JPY -0.08%   GBP/USD +0.05%   BTC/USD +1.42%   ETH/USD +0.96%   EUR/JPY +0.11%   AUD/USD -0.03%
        </span>
      </div>
    </div>
  );
}
