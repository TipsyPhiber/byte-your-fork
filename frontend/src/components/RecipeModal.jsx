import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import CookMode from '../CookMode';
import EditRecipeForm from './EditRecipeForm';
import RatingSection from './RatingSection';
import CommentsSection from './CommentsSection';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1495195129352-aec325a55b65?auto=format&fit=crop&w=600&q=80';
const BASE = `${API_BASE}/api`;

export default function RecipeModal({ recipe, token, user, isAdmin, favoritedIds, onClose, onToggleFavorite, onDelete, onRatingUpdate, onRecipeSaved }) {
  const [cookMode, setCookMode] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const handleSaveEdit = async () => {
    try {
      await axios.put(
        `${BASE}/recipes/${recipe.id}`,
        { title: editForm.title, ttc: parseInt(editForm.ttc), ingredients: editForm.ingredients, steps: editForm.steps },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditForm(null);
      onRecipeSaved?.();
    } catch { alert('Save failed.'); }
  };

  if (cookMode) {
    return <CookMode recipe={recipe} token={token} onExit={() => setCookMode(false)} />;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>

        {editForm ? (
          <EditRecipeForm
            editForm={editForm}
            setEditForm={setEditForm}
            onSave={handleSaveEdit}
            onCancel={() => setEditForm(null)}
          />
        ) : (
          <>
            <img className="modal-hero" src={recipe.image_url || FALLBACK_IMG} onError={e => e.target.src = FALLBACK_IMG} alt="" />
            <div className="modal-scroll">
              <div className="modal-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <h1 className="modal-recipe-title" style={{ fontSize: '2.5rem', color: 'var(--dark-blue)', margin: 0 }}>{recipe.title}</h1>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '16px', paddingTop: '8px', alignItems: 'center' }}>
                  <button
                    className={`heart-btn ${favoritedIds.has(recipe.id) ? 'favorited' : ''}`}
                    style={{ position: 'static', fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={e => onToggleFavorite(e, recipe.id)}
                    title={favoritedIds.has(recipe.id) ? 'Unfavorite' : 'Save to Favorites'}
                  >
                    {favoritedIds.has(recipe.id) ? '❤️' : '🤍'}
                  </button>
                  <button className="primary-button" style={{ padding: '10px 20px', fontSize: '0.9rem' }} onClick={() => setCookMode(true)}>
                    👨‍🍳 Cook Mode
                  </button>
                  {isAdmin && (
                    <>
                      <button className="tag-pill" onClick={() => setEditForm({ title: recipe.title, ttc: recipe.ttc, ingredients: recipe.ingredients || [], steps: recipe.steps || [] })}>Edit</button>
                      <button className="tag-pill" style={{ background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }} onClick={() => onDelete(recipe.id)}>Delete</button>
                    </>
                  )}
                </div>
              </div>

              <div className="recipe-meta">
                <span>⏱️ {recipe.ttc} mins</span>
                <span>👨‍🍳 Admin</span>
                {recipe.tag && <span>🍽️ {recipe.tag}</span>}
                {recipe.view_count > 0 && <span>👁️ {recipe.view_count} {parseInt(recipe.view_count) === 1 ? 'view' : 'views'}</span>}
              </div>

              <div className="recipe-detail-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                <div>
                  <h3 className="recipe-section-title">Ingredients</h3>
                  <ul style={{ paddingLeft: '20px', lineHeight: '2' }}>
                    {recipe.ingredients?.map((ing, i) => (
                      <li key={i}><strong>{ing.amount}</strong> {ing.name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="recipe-section-title">Instructions</h3>
                  <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                    {recipe.steps?.map((s, i) => <li key={i} style={{ marginBottom: '15px' }}>{s}</li>)}
                  </ol>
                </div>
              </div>

              <RatingSection recipeId={recipe.id} token={token} onRatingUpdate={onRatingUpdate} />
              <CommentsSection recipeId={recipe.id} token={token} user={user} isAdmin={isAdmin} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
