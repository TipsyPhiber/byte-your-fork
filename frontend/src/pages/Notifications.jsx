import React from 'react';
import { Bell, Tag } from 'lucide-react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1495195129352-aec325a55b65?auto=format&fit=crop&w=600&q=80';

export default function Notifications({ visibleNotifs, onClear, onDismiss, onOpen }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--dark-blue)' }}>Notifications</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-light)', fontSize: '0.875rem' }}>
            Recipes added in the last 30 days
          </p>
        </div>
        {visibleNotifs.length > 0 && (
          <button className="tag-pill" onClick={onClear}>Clear All</button>
        )}
      </div>

      {visibleNotifs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-light)' }}>
          <Bell size={48} style={{ marginBottom: '16px', opacity: 0.2, color: 'var(--text-2)' }} />
          <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>You're all caught up!</p>
          <p style={{ margin: '8px 0 0', fontSize: '0.875rem' }}>No new recipes in the last 30 days.</p>
        </div>
      ) : (
        <div className="notif-grid">
          {visibleNotifs.map(n => (
            <div key={n.id} className="notif-card" onClick={() => onOpen(n.id)}>
              <img src={n.image_url || FALLBACK_IMG} onError={e => e.target.src = FALLBACK_IMG} alt="" className="notif-img" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' }}>
                  {n.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {n.tag && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Tag size={11} /> {n.tag}
                    </span>
                  )}
                  <span>Added {new Date(n.creation_date).toLocaleDateString()}</span>
                </div>
              </div>
              <span className="notif-new-badge">New</span>
              <button className="notif-dismiss" onClick={e => onDismiss(e, n.id)} title="Dismiss">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
