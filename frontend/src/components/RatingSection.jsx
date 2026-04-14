import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

const BASE = `${API_BASE}/api`;

export default function RatingSection({ recipeId, token, onRatingUpdate }) {
  const [ratingData, setRatingData] = useState({ average: 0, count: 0, userRating: null });
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    if (!recipeId || !token) return;
    axios.get(`${BASE}/ratings/${recipeId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setRatingData(res.data))
      .catch(() => {});
  }, [recipeId, token]);

  const handleRate = async (rating) => {
    try {
      const res = await axios.post(`${BASE}/ratings/${recipeId}`, { rating }, { headers: { Authorization: `Bearer ${token}` } });
      setRatingData(res.data);
      onRatingUpdate?.(recipeId, res.data.average, res.data.count);
    } catch { /* ignore */ }
  };

  return (
    <div style={{ marginTop: '32px' }}>
      <h3 className="recipe-section-title">
        Rate This Recipe
        {ratingData.count > 0 && (
          <span style={{ fontWeight: 400, fontSize: '0.9rem', color: 'var(--text-light)', marginLeft: '12px' }}>
            {ratingData.average} / 5 ({ratingData.count} {ratingData.count === 1 ? 'rating' : 'ratings'})
          </span>
        )}
      </h3>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.8rem', padding: '2px', transition: 'transform 0.1s' }}
          >
            {star <= (hoverRating || ratingData.userRating || 0) ? '⭐' : '☆'}
          </button>
        ))}
      </div>
      {ratingData.userRating && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)' }}>Your rating: {ratingData.userRating} / 5</p>
      )}
    </div>
  );
}
