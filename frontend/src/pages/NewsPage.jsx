import DashboardNews from '../components/DashboardNews';
import TopNav from '../components/TopNav';

export default function NewsPage() {
  return (
    <div className="layout">
      <TopNav
        title="Market News"
        subtitle="Latest crypto headlines, macro updates, and market-moving stories."
      />

      <DashboardNews limit={24} title="All Crypto Headlines" />
    </div>
  );
}
