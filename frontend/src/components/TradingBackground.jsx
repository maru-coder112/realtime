export default function TradingBackground() {
  return (
    <div className="trading-bg" aria-hidden="true">
      <video
        className="trading-bg-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src="https://cdn.coverr.co/videos/coverr-stock-market-1579/1080p.mp4" type="video/mp4" />
      </video>
      <div className="trading-bg-overlay" />
      <div className="trading-bg-grid" />
    </div>
  );
}
