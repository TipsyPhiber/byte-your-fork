import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Heart, Clock, Star, ShoppingCart, Check, Leaf } from 'lucide-react';
import { API_BASE } from '../config';
import { showToast } from '../utils/toast';
import { DIETARY_LABELS } from '../utils/dietaryFilter';

const SHORT_DIETARY = {
  vegan: 'Vegan',
  vegetarian: 'Veg',
  dairy_free: 'DF',
  gluten_free: 'GF',
  nut_free: 'NF',
  egg_free: 'EF',
  shellfish_free: 'SF',
};

// Prefer showing the strongest/most-user-relevant flags first, cap at 3
const BADGE_PRIORITY = ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free', 'egg_free', 'shellfish_free'];
function topFlags(flags = [], max = 3) {
  return BADGE_PRIORITY.filter(f => flags.includes(f)).slice(0, max);
}

const BASE = `${API_BASE}/api`;
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1495195129352-aec325a55b65?auto=format&fit=crop&w=600&q=80';

function formatAddError(err) {
  const serverMsg = err.response?.data?.error;
  if (serverMsg) return serverMsg;
  const status = err.response?.status;
  if (status === 404) return 'Endpoint not found (HTTP 404). Restart the backend server so the new route loads.';
  if (status === 401) return 'Signed out. Please log in again.';
  if (status) return `Server error ${status}. Check the backend logs.`;
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') return 'Cannot reach server. Is the backend running?';
  return err.message || 'Could not add to shopping list.';
}

export default function RecipeGrid({ list, favoritedIds, onOpen, onToggleFavorite, token }) {
  const [addState, setAddState] = useState({}); // { [recipeId]: 'adding' | 'added' | 'error' }
  const navigate = useNavigate();

  const handleAddToList = async (e, recipeId) => {
    e.stopPropagation();
    if (!token || addState[recipeId] === 'adding') return;
    setAddState(s => ({ ...s, [recipeId]: 'adding' }));
    try {
      const res = await axios.post(
        `${BASE}/shopping-list/from-recipe/${recipeId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAddState(s => ({ ...s, [recipeId]: 'added' }));
      setTimeout(() => setAddState(s => { const n = { ...s }; delete n[recipeId]; return n; }), 2000);
      const count = res.data?.count ?? 0;
      const title = res.data?.recipe_title || 'recipe';
      showToast({
        kind: 'success',
        message: `Added ${count} ingredient${count === 1 ? '' : 's'} from ${title}`,
        action: { label: 'View list', onClick: () => navigate('/shopping-list') },
      });
    } catch (err) {
      setAddState(s => ({ ...s, [recipeId]: 'error' }));
      setTimeout(() => setAddState(s => { const n = { ...s }; delete n[recipeId]; return n; }), 2000);
      showToast({ kind: 'error', message: formatAddError(err), duration: 7000 });
    }
  };

  return (
    <div className="recipe-grid">
      {list.map(r => {
        const state = addState[r.id];
        return (
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
              {token && (
                <button
                  onClick={e => handleAddToList(e, r.id)}
                  disabled={state === 'adding'}
                  title={state === 'added' ? 'Added' : state === 'error' ? 'Failed' : 'Add to shopping list'}
                  style={{
                    position: 'absolute', top: 10, right: 48,
                    width: 30, height: 30, borderRadius: '50%',
                    background: state === 'added' ? '#22c55e' : 'rgba(255,255,255,0.92)',
                    color: state === 'added' ? 'white' : '#111827',
                    border: 'none', cursor: state === 'adding' ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)', padding: 0,
                    transition: 'background 0.2s, color 0.2s',
                  }}
                >
                  {state === 'added' ? <Check size={14} /> : <ShoppingCart size={14} />}
                </button>
              )}
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
              {topFlags(r.dietary_flags).length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  {topFlags(r.dietary_flags).map(f => (
                    <span
                      key={f}
                      title={DIETARY_LABELS[f]}
                      style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px',
                        borderRadius: 4, background: 'rgba(16,185,129,0.12)', color: '#047857',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {SHORT_DIETARY[f]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
