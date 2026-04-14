import React from 'react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1495195129352-aec325a55b65?auto=format&fit=crop&w=600&q=80';

export default function RecipeGrid({ list, favoritedIds, onOpen, onToggleFavorite }) {
  return (
    <div className="recipe-grid">
      {list.map(r => (
        <div key={r.id} className="recipe-card" onClick={() => onOpen(r.id)}>
          <div style={{ position: 'relative' }}>
            <img
              className="recipe-card-img"
              src={r.image_url || FALLBACK_IMG}
              onError={e => e.target.src = FALLBACK_IMG}
              alt={r.title}
            />
            <button
              className={`heart-btn ${favoritedIds.has(r.id) ? 'favorited' : ''}`}
              onClick={e => onToggleFavorite(e, r.id)}
              title={favoritedIds.has(r.id) ? 'Unfavorite' : 'Favorite'}
            >
              {favoritedIds.has(r.id) ? '❤️' : '🤍'}
            </button>
          </div>
          <div className="recipe-card-info">
            <div>{r.title}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {r.tag && <div className="recipe-card-tag">{r.tag}</div>}
              {parseFloat(r.avg_rating) > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                  ⭐ {parseFloat(r.avg_rating).toFixed(1)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
