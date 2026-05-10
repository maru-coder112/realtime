import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const DEFAULT_PREFERENCES = {
  email: true,
  push: true,
  tradeAlerts: true,
  aiAlerts: true,
  weeklyReport: true,
};

function normalizePreferences(preferences) {
  return {
    ...DEFAULT_PREFERENCES,
    ...(preferences || {}),
  };
}

function buildNotificationStyle(variant) {
  if (variant === 'success') return 'notification-toast success';
  if (variant === 'error') return 'notification-toast error';
  if (variant === 'warning') return 'notification-toast warning';
  return 'notification-toast info';
}

function ToastStack({ toasts, dismissToast }) {
  if (!toasts.length) return null;

  return (
    <div className="notification-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={buildNotificationStyle(toast.variant)}>
          <div className="notification-toast-copy">
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>
          <button type="button" className="notification-toast-dismiss" onClick={() => dismissToast(toast.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);

  const preferences = useMemo(() => normalizePreferences(user?.profileSettings?.notifications || user?.profile_settings?.notifications), [user]);

  const dismissToast = (id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const notify = ({ title, message, variant = 'info', kind = 'system', duration = 4200 }) => {
    const shouldShow = kind === 'system'
      || (kind === 'trade' && preferences.tradeAlerts && preferences.push)
      || (kind === 'ai' && preferences.aiAlerts && preferences.push)
      || (kind === 'report' && preferences.weeklyReport && preferences.push)
      || (kind === 'email' && preferences.email)
      || (kind === 'push' && preferences.push);

    if (!shouldShow) return null;

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const toast = {
      id,
      title: title || 'Notification',
      message: message || '',
      variant,
    };

    setToasts((current) => [toast, ...current].slice(0, 4));
    if (duration > 0) {
      window.setTimeout(() => dismissToast(id), duration);
    }
    return id;
  };

  const value = { notify, preferences, dismissToast };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} dismissToast={dismissToast} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }
  return context;
}