import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AIPredictionPage from './pages/AIPredictionPage';
import NewsPage from './pages/NewsPage';
import StrategyPage from './pages/StrategyPage';
import BacktestResultsPage from './pages/BacktestResultsPage';
import AdminPage from './pages/AdminPage';
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
            <PrivateRoute>
              <AIPredictionPage />
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
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Routes>
    </div>
  );
}
