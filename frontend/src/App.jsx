import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AIPredictionPage from './pages/AIPredictionPage';
import NewsPage from './pages/NewsPage';
import StrategyPage from './pages/StrategyPage';
import BacktestResultsPage from './pages/BacktestResultsPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import PortfolioPage from './pages/PortfolioPage';
import WalletPage from './pages/WalletPage';
import LiveTradingPage from './pages/LiveTradingPage';
import { useAuth } from './context/AuthContext';
import GlobalLightBackground from './components/GlobalLightBackground';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <p>Loading...</p>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <p>Loading...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <div className="app-shell">
      <GlobalLightBackground />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/news"
          element={
            <PrivateRoute>
              <NewsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/ai-prediction"
          element={
            // Dev helper: append `?dev=1` to bypass auth during local development for visual checks
            (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dev') === '1')
              ? <AIPredictionPage />
              : (
                <PrivateRoute>
                  <AIPredictionPage />
                </PrivateRoute>
              )
          }
        />
        <Route
          path="/wallet"
          element={
            <PrivateRoute>
              <WalletPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/live-trading"
          element={
            <PrivateRoute>
              <LiveTradingPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/portfolio"
          element={
            <PrivateRoute>
              <PortfolioPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/strategy"
          element={
            <PrivateRoute>
              <StrategyPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/backtests/:id"
          element={
            <PrivateRoute>
              <BacktestResultsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Routes>
    </div>
  );
}
