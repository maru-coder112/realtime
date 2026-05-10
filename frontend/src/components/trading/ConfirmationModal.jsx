import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';

export default function ConfirmationModal({ open, onClose, order, onConfirm }) {
  const { notify } = useNotifications();
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [result, setResult] = useState(null);

  if (!open) return null;

  const handleConfirm = async () => {
    setStatus('loading');
    try {
      const rec = await onConfirm();
      setResult(rec);
      setStatus('success');
      notify({ title: 'Trade executed', message: `${rec.side.toUpperCase()} ${rec.qty} ${rec.asset} placed`, variant: 'success', kind: 'trade' });
      setTimeout(() => { onClose(); setStatus('idle'); setResult(null); }, 900);
    } catch (err) {
      setStatus('error');
      notify({ title: 'Execution failed', message: err?.message || 'Unable to place trade', variant: 'error', kind: 'trade' });
    }
  };

  return (
    <div className="modal-backdrop trade-modal-backdrop">
      <motion.div className="card trade-modal-card" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
        <div className="trade-modal-content">
          {status === 'idle' && (
            <>
              <h4>Confirm Order</h4>
              <div className="trade-modal-summary">
                <div><strong>{order?.side?.toUpperCase()}</strong> {order?.qty} {order?.asset}</div>
                <div className="muted">Type: {order?.type} • Price: {order?.price ?? 'Market'}</div>
              </div>

              <div className="trade-modal-actions">
                <button className="nav-btn" onClick={onClose}>Cancel</button>
                <button className="nav-btn" onClick={handleConfirm} style={{ background: 'linear-gradient(135deg,#00C896,#3B82F6)', color: '#04121a' }}>Confirm</button>
              </div>
            </>
          )}

          {status === 'loading' && (
            <div className="trade-modal-loading">
              <div className="muted">Placing order…</div>
            </div>
          )}

          {status === 'success' && result && (
            <div style={{ padding: 12, display: 'grid', gap: 8 }}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <h4 style={{ margin: 0 }}>Order Confirmed</h4>
                <div className="muted">Trade ID: {result.id}</div>
              </motion.div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="muted">Side</div>
                  <strong>{result.side}</strong>
                </div>
                <div>
                  <div className="muted">Qty</div>
                  <strong>{result.qty}</strong>
                </div>
                <div>
                  <div className="muted">Price</div>
                  <strong>{result.entryPrice?.toFixed?.(2) ?? 'Market'}</strong>
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div style={{ padding: 12 }}>
              <h4 style={{ margin: 0, color: '#fecaca' }}>Order failed</h4>
              <div className="muted">Please try again.</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="nav-btn" onClick={onClose}>Close</button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
