import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { onToast } from '../utils/toast';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => onToast((toast) => {
    setToasts(prev => [...prev, toast]);
    if (toast.duration > 0) {
      setTimeout(() => dismiss(toast.id), toast.duration);
    }
  }), [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
      maxWidth: 420,
      width: 'calc(100% - 32px)',
    }}>
      {toasts.map(t => {
        const palette = t.kind === 'success'
          ? { bg: '#22c55e', fg: 'white', icon: <CheckCircle2 size={18} /> }
          : t.kind === 'error'
          ? { bg: '#ef4444', fg: 'white', icon: <AlertCircle size={18} /> }
          : { bg: 'var(--surface)', fg: 'var(--text-1)', icon: null };
        return (
          <div
            key={t.id}
            role="status"
            style={{
              pointerEvents: 'auto',
              background: palette.bg,
              color: palette.fg,
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              animation: 'byf-toast-in 0.2s ease-out',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            {palette.icon}
            <span style={{ flex: 1, lineHeight: 1.3 }}>{t.message}</span>
            {t.action && (
              <button
                onClick={() => { t.action.onClick(); dismiss(t.id); }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: palette.fg,
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  fontFamily: 'inherit',
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              style={{ background: 'none', border: 'none', color: palette.fg, cursor: 'pointer', padding: 2, display: 'flex' }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes byf-toast-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
