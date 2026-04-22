import React from 'react';
import { Heart, Clock, Star } from 'lucide-react';

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
              <Heart size={15} fill={favoritedIds.has(r.id) ? 'currentColor' : 'none'} />
            </button>
          </div>
          <div className="recipe-card-info">
            <div className="recipe-card-title">{r.title}</div>
            <div className="recipe-card-meta">
              {r.tag && <span className="recipe-card-tag">{r.tag}</span>}
              {r.ttc && (
                <span className="recipe-card-time">
                  <Clock size={11} /> {r.ttc}m
                </span>
              )}
              {parseFloat(r.avg_rating) > 0 && (
                <span className="recipe-card-rating">
                  <Star size={11} fill="currentColor" /> {parseFloat(r.avg_rating).toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
