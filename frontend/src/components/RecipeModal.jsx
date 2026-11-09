import React, { useState } from 'react';
import { api } from '../api';
import { isNative } from '../native';
import CookMode from '../CookMode';
import EditRecipeForm from './EditRecipeForm';
import RatingSection from './RatingSection';
import CommentsSection from './CommentsSection';
import { X, Clock, Tag, Eye, Heart, ChefHat, Pencil, Trash2, AlertTriangle, Minus, Plus, RotateCcw, Users, ShoppingCart, Check, Printer } from 'lucide-react';
import { cleanSteps } from '../utils/cleanRecipe';
import { scaleAmount } from '../utils/scaleAmount';
import { showToast } from '../utils/toast';
import { DIETARY_LABELS } from '../utils/dietaryFilter';

const BASE_SERVINGS = 4;
const MIN_SERVINGS = 1;
const MAX_SERVINGS = 32;

// Inline SVG placeholder — no external CDN dependency, works offline / behind strict CSP.
const FALLBACK_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1f2937"/><stop offset="1" stop-color="#0b1220"/>
    </linearGradient></defs>
    <rect width="600" height="400" fill="url(#g)"/>
    <g fill="none" stroke="#64748b" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M210 220c0-30 25-55 55-55s55 25 55 55c25 0 45 20 45 45 0 25-20 45-45 45H210c-25 0-45-20-45-45 0-25 20-45 45-45z"/>
      <path d="M225 280h150"/>
    </g>
    <text x="300" y="345" font-family="system-ui,sans-serif" font-size="18" fill="#94a3b8" text-anchor="middle">No image</text>
  </svg>`
);

export default function RecipeModal({ recipe, token, user, isAdmin, favoritedIds, onClose, onToggleFavorite, onDelete, onRatingUpdate, onRecipeSaved }) {
  const [cookMode, setCookMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [servings, setServings] = useState(BASE_SERVINGS);
  const [addToListState, setAddToListState] = useState('idle'); // idle | adding | added | error
  const [imgFailed, setImgFailed] = useState(false);
  const imgKey = `${recipe.id}|${recipe.image_url ?? ''}`;
  const [prevImgKey, setPrevImgKey] = useState(imgKey);
  if (prevImgKey !== imgKey) {
    setPrevImgKey(imgKey);
    setImgFailed(false);
  }

  const scale = servings / BASE_SERVINGS;
  const adjustServings = (delta) => setServings(s => Math.max(MIN_SERVINGS, Math.min(MAX_SERVINGS, s + delta)));

  const handleAddAllToList = async () => {
    if (!recipe.ingredients || recipe.ingredients.length === 0 || addToListState === 'adding') return;
    setAddToListState('adding');
    try {
      const items = recipe.ingredients.map(ing => ({
        ingredient_name: ing.name,
        amount: scaleAmount(ing.amount, scale),
      }));
      const res = await api.post('/shopping-list/bulk', { items, recipe_id: recipe.id });
      setAddToListState('added');
      setTimeout(() => setAddToListState('idle'), 2000);
      const count = res.data?.items?.length ?? items.length;
      showToast({
        kind: 'success',
        message: `Added ${count} ingredient${count === 1 ? '' : 's'} from ${recipe.title}`,
      });
    } catch (err) {
      setAddToListState('error');
      setTimeout(() => setAddToListState('idle'), 2000);
      const serverMsg = err.response?.data?.error;
      const status = err.response?.status;
      const msg = serverMsg
        || (status === 404 ? 'Endpoint not found (HTTP 404). Restart the backend server.'
          : status ? `Server error ${status}.`
          : 'Cannot reach server. Is the backend running?');
      showToast({ kind: 'error', message: msg, duration: 7000 });
    }
  };

  const handleSaveEdit = async () => {
    try {
      const normalizedSteps = (editForm.steps || [])
        .map(s => (s || '').trim())
        .filter(Boolean)
        .map(s => /[.!?:]$/.test(s) ? s : `${s}.`);
      await api.put(`/recipes/${recipe.id}`, {
        title: editForm.title,
        ttc: parseInt(editForm.ttc),
        ingredients: editForm.ingredients,
        steps: normalizedSteps,
        imageUrl: editForm.imageUrl ?? '',
        tag: editForm.tag ?? '',
        dietary_flags: editForm.dietary_flags ?? [],
      });
      setEditForm(null);
      onRecipeSaved?.();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Unknown error';
      console.error('Save failed:', err);
      showToast({ kind: 'error', message: `Save failed: ${msg}`, duration: 6000 });
    }
  };

  if (cookMode) return <CookMode recipe={recipe} scale={scale} onExit={() => setCookMode(false)} />;

  const isFavorited = favoritedIds.has(recipe.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style>{`
        @media print {
          @page { margin: 0.6in; }
          body * { visibility: hidden !important; }
          .recipe-print-sheet, .recipe-print-sheet * { visibility: visible !important; }
          .recipe-print-sheet { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 24px !important; background: #fff !important; color: #000 !important; }
          .recipe-print-sheet * { color: #000 !important; background: transparent !important; }
        }
        .recipe-print-sheet { display: none; }
      `}</style>
      <div className="recipe-print-sheet">
        <h1 style={{ fontFamily: 'inherit', fontSize: 26, margin: '0 0 8px' }}>{recipe.title}</h1>
        <div style={{ fontSize: 13, color: '#444', marginBottom: 20 }}>
          {recipe.ttc} min · {servings} serving{servings === 1 ? '' : 's'}{recipe.tag ? ` · ${recipe.tag}` : ''}
        </div>
        <h2 style={{ fontSize: 16, margin: '0 0 8px', borderBottom: '1px solid #000', paddingBottom: 3 }}>Ingredients</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.7, fontSize: 13, margin: '0 0 20px' }}>
          {recipe.ingredients?.map((ing, i) => (
            <li key={i}>
              {ing.amount && <strong>{scaleAmount(ing.amount, scale)} </strong>}
              {ing.name}
            </li>
          ))}
        </ul>
        <h2 style={{ fontSize: 16, margin: '0 0 8px', borderBottom: '1px solid #000', paddingBottom: 3 }}>Instructions</h2>
        <ol style={{ paddingLeft: 22, lineHeight: 1.6, fontSize: 13, margin: 0 }}>
          {cleanSteps(recipe.steps).map((s, i) => <li key={i} style={{ marginBottom: 8 }}>{s}</li>)}
        </ol>
      </div>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {editForm ? (
          <EditRecipeForm editForm={editForm} setEditForm={setEditForm} onSave={handleSaveEdit} onCancel={() => setEditForm(null)} />
        ) : (
          <>
            <img className="modal-hero" src={imgFailed ? FALLBACK_IMG : (recipe.image_url || FALLBACK_IMG)} onError={() => setImgFailed(true)} alt={recipe.title} />
            <div className="modal-scroll">

              {/* Delete confirmation banner */}
              {confirmDelete && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: 'var(--danger)', minWidth: 160 }}>Delete this recipe? This cannot be undone.</span>
                  <button onClick={() => onDelete(recipe.id)} style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'inherit', minHeight: 44 }}>Delete</button>
                  <button onClick={() => setConfirmDelete(false)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit', minHeight: 44 }}>Cancel</button>
                </div>
              )}

              <div className="modal-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h1 className="modal-recipe-title" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-1)', margin: 0, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                  {recipe.title}
                </h1>
                {(isAdmin || !isNative) && (
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '20px', alignItems: 'center' }}>
                    {/* No print dialog inside the Android webview — web only */}
                    {!isNative && (
                      <button className="icon-btn" onClick={() => window.print()} title="Print recipe" aria-label="Print recipe">
                        <Printer size={20} />
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button className="icon-btn" title="Edit recipe" aria-label="Edit recipe" onClick={() => setEditForm({ title: recipe.title, ttc: recipe.ttc, ingredients: recipe.ingredients || [], steps: recipe.steps || [], imageUrl: recipe.image_url || '', tag: recipe.tag || '', dietary_flags: recipe.dietary_flags || [] })}>
                          <Pencil size={18} />
                        </button>
                        <button className="icon-btn danger" title="Delete recipe" aria-label="Delete recipe" onClick={() => setConfirmDelete(true)}>
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="recipe-meta">
                <span><Clock size={14} /> {recipe.ttc} mins</span>
                {recipe.tag && <span><Tag size={14} /> {recipe.tag}</span>}
                {recipe.view_count > 0 && <span><Eye size={14} /> {recipe.view_count} {parseInt(recipe.view_count) === 1 ? 'view' : 'views'}</span>}
              </div>

              {recipe.dietary_flags?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 0 16px' }}>
                  {recipe.dietary_flags.map(f => (
                    <span key={f} style={{
                      fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px',
                      borderRadius: 999, background: 'rgba(16,185,129,0.12)', color: '#047857',
                    }}>
                      {DIETARY_LABELS[f] || f}
                    </span>
                  ))}
                </div>
              )}

              <div className="recipe-detail-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <h3 className="recipe-section-title" style={{ margin: 0 }}>Ingredients</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '999px', padding: '2px 6px' }}>
                      <Users size={14} style={{ color: 'var(--text-2)', marginLeft: '4px' }} />
                      <button
                        onClick={() => adjustServings(-1)}
                        disabled={servings <= MIN_SERVINGS}
                        aria-label="Decrease servings"
                        style={{ background: 'none', border: 'none', cursor: servings <= MIN_SERVINGS ? 'not-allowed' : 'pointer', color: 'var(--text-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '999px', opacity: servings <= MIN_SERVINGS ? 0.4 : 1 }}
                      >
                        <Minus size={15} />
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)', minWidth: '70px', textAlign: 'center' }}>
                        {servings} {servings === 1 ? 'serving' : 'servings'}
                      </span>
                      <button
                        onClick={() => adjustServings(1)}
                        disabled={servings >= MAX_SERVINGS}
                        aria-label="Increase servings"
                        style={{ background: 'none', border: 'none', cursor: servings >= MAX_SERVINGS ? 'not-allowed' : 'pointer', color: 'var(--text-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '999px', opacity: servings >= MAX_SERVINGS ? 0.4 : 1 }}
                      >
                        <Plus size={15} />
                      </button>
                      {servings !== BASE_SERVINGS && (
                        <button
                          onClick={() => setServings(BASE_SERVINGS)}
                          aria-label="Reset servings"
                          title="Reset"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '999px' }}
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <ul style={{ paddingLeft: '20px', lineHeight: '2', color: 'var(--text-1)', margin: 0 }}>
                    {recipe.ingredients?.map((ing, i) => (
                      <li key={i}><strong>{scaleAmount(ing.amount, scale)}</strong> {ing.name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="recipe-section-title">Instructions</h3>
                  <ol style={{ paddingLeft: '20px', lineHeight: '1.85', color: 'var(--text-1)', margin: 0 }}>
                    {cleanSteps(recipe.steps).map((s, i) => <li key={i} style={{ marginBottom: '14px' }}>{s}</li>)}
                  </ol>
                </div>
              </div>

              <RatingSection recipeId={recipe.id} token={token} onRatingUpdate={onRatingUpdate} />
              <CommentsSection recipeId={recipe.id} token={token} user={user} isAdmin={isAdmin} />
            </div>

            {/* Primary actions stay reachable in the thumb zone */}
            <div className="modal-action-bar">
              <button
                className="icon-btn"
                style={{ color: isFavorited ? 'var(--danger)' : 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 14, width: 50, height: 50 }}
                onClick={e => onToggleFavorite(e, recipe.id)}
                aria-label={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
              >
                <Heart size={22} fill={isFavorited ? 'currentColor' : 'none'} />
              </button>
              {recipe.ingredients?.length > 0 && (
                <button
                  className="icon-btn"
                  style={{
                    border: '1px solid var(--border)', borderRadius: 14, width: 50, height: 50,
                    background: addToListState === 'added' ? 'var(--success)' : undefined,
                    color: addToListState === 'added' ? 'white' : 'var(--text-2)',
                  }}
                  onClick={handleAddAllToList}
                  disabled={addToListState === 'adding'}
                  aria-label="Add ingredients to shopping list"
                  title="Add ingredients to shopping list"
                >
                  {addToListState === 'added' ? <Check size={22} /> : <ShoppingCart size={22} />}
                </button>
              )}
              <button className="primary-button" onClick={() => setCookMode(true)}>
                <ChefHat size={20} /> Start Cooking
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
