import React from 'react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1495195129352-aec325a55b65?auto=format&fit=crop&w=600&q=80';

export default function Notifications({ visibleNotifs, onClear, onDismiss, onOpen }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--dark-blue)' }}>Recent Additions</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-light)', fontSize: '0.9rem' }}>Recipes added in the last 30 days</p>
        </div>
        {visibleNotifs.length > 0 && (
          <button className="tag-pill" onClick={onClear}>Clear All</button>
        )}
      </div>

      {visibleNotifs.length === 0
        ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-light)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔔</div>
            <p style={{ margin: 0, fontWeight: 600 }}>You're all caught up!</p>
            <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>No new recipes since you last checked.</p>
          </div>
        )
        : (
          <div className="notif-grid">
            {visibleNotifs.map(n => (
              <div key={n.id} className="notif-card" onClick={() => onOpen(n.id)}>
                <img src={n.image_url || FALLBACK_IMG} onError={e => e.target.src = FALLBACK_IMG} alt="" className="notif-img" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--dark-blue)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    {n.tag && <span style={{ marginRight: '10px' }}>🍽️ {n.tag}</span>}
                    <span>Added {new Date(n.creation_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className="notif-new-badge">NEW</span>
                <button className="notif-dismiss" onClick={e => onDismiss(e, n.id)} title="Dismiss">✕</button>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
