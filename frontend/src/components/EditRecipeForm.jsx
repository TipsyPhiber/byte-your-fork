import React from 'react';
import { Trash2 } from 'lucide-react';

export default function EditRecipeForm({ editForm, setEditForm, onSave, onCancel }) {
  return (
    <div className="modal-scroll" style={{ paddingTop: '60px' }}>
      <h2 style={{ color: 'var(--text-1)', marginBottom: '24px', fontWeight: 800, letterSpacing: '-0.02em' }}>Edit Recipe</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <input className="edit-input" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" />
        <input className="edit-input" type="number" value={editForm.ttc} onChange={e => setEditForm({ ...editForm, ttc: e.target.value })} placeholder="Time to cook (mins)" />
      </div>

      <h3 className="recipe-section-title">Ingredients</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {editForm.ingredients.map((ing, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              className="edit-input"
              style={{ flex: 2 }}
              value={ing.name}
              onChange={e => { const ings = [...editForm.ingredients]; ings[i] = { ...ings[i], name: e.target.value }; setEditForm({ ...editForm, ingredients: ings }); }}
              placeholder="Ingredient"
            />
            <input
              className="edit-input"
              style={{ flex: 1 }}
              value={ing.amount}
              onChange={e => { const ings = [...editForm.ingredients]; ings[i] = { ...ings[i], amount: e.target.value }; setEditForm({ ...editForm, ingredients: ings }); }}
              placeholder="Amount"
            />
            <button
              onClick={() => setEditForm({ ...editForm, ingredients: editForm.ingredients.filter((_, j) => j !== i) })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '6px', flexShrink: 0, transition: 'color 0.15s' }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button className="tag-pill" style={{ alignSelf: 'flex-start' }} onClick={() => setEditForm({ ...editForm, ingredients: [...editForm.ingredients, { name: '', amount: '' }] })}>+ Add Ingredient</button>
      </div>

      <h3 className="recipe-section-title">Instructions</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {editForm.steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ paddingTop: '10px', fontWeight: 700, color: 'var(--accent)', minWidth: '22px', fontSize: '0.85rem' }}>{i + 1}.</span>
            <textarea
              className="edit-input"
              style={{ flex: 1, minHeight: '70px', resize: 'vertical' }}
              value={step}
              onChange={e => { const steps = [...editForm.steps]; steps[i] = e.target.value; setEditForm({ ...editForm, steps }); }}
            />
            <button
              onClick={() => setEditForm({ ...editForm, steps: editForm.steps.filter((_, j) => j !== i) })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '6px', flexShrink: 0, paddingTop: '12px', transition: 'color 0.15s' }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button className="tag-pill" style={{ alignSelf: 'flex-start' }} onClick={() => setEditForm({ ...editForm, steps: [...editForm.steps, ''] })}>+ Add Step</button>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="primary-button" onClick={onSave}>Save Changes</button>
        <button
          onClick={onCancel}
          style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text-2)', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', fontFamily: 'inherit' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
