import React from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export default function ToastNotification({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const getIcon = () => {
          switch (toast.type) {
            case 'success':
              return <CheckCircle size={18} color="var(--color-signal-green)" />;
            case 'warning':
              return <AlertTriangle size={18} color="var(--color-signal-amber)" />;
            case 'danger':
              return <XCircle size={18} color="var(--color-signal-red)" />;
            default:
              return <Info size={18} color="var(--color-signal-cyan)" />;
          }
        };

        return (
          <div key={toast.id} className={`toast toast-${toast.type || 'info'}`}>
            {getIcon()}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{toast.title}</div>
              {toast.message && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
                  {toast.message}
                </div>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-ink-dim)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex'
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
