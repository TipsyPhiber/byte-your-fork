import React from 'react';

export default function EditRecipeForm({ editForm, setEditForm, onSave, onCancel }) {
  return (
    <div className="modal-scroll" style={{ paddingTop: '60px' }}>
      <h2 style={{ color: 'var(--dark-blue)', marginBottom: '24px' }}>Edit Recipe</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <input className="edit-input" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" />
        <input className="edit-input" type="number" value={editForm.ttc} onChange={e => setEditForm({ ...editForm, ttc: e.target.value })} placeholder="Time to cook (mins)" />
      </div>

      <h3 className="recipe-section-title">Ingredients</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {editForm.ingredients.map((ing, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px' }}>
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
            <button onClick={() => setEditForm({ ...editForm, ingredients: editForm.ingredients.filter((_, j) => j !== i) })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>🗑️</button>
          </div>
        ))}
        <button className="tag-pill" onClick={() => setEditForm({ ...editForm, ingredients: [...editForm.ingredients, { name: '', amount: '' }] })}>+ Add Ingredient</button>
      </div>

      <h3 className="recipe-section-title">Instructions</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {editForm.steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ paddingTop: '10px', fontWeight: 'bold', color: 'var(--primary-blue)', minWidth: '20px' }}>{i + 1}.</span>
            <textarea
              className="edit-input"
              style={{ flex: 1, minHeight: '70px', resize: 'vertical' }}
              value={step}
              onChange={e => { const steps = [...editForm.steps]; steps[i] = e.target.value; setEditForm({ ...editForm, steps }); }}
            />
            <button onClick={() => setEditForm({ ...editForm, steps: editForm.steps.filter((_, j) => j !== i) })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', paddingTop: '8px' }}>🗑️</button>
          </div>
        ))}
        <button className="tag-pill" onClick={() => setEditForm({ ...editForm, steps: [...editForm.steps, ''] })}>+ Add Step</button>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="primary-button" onClick={onSave}>Save Changes</button>
        <button className="primary-button" style={{ background: '#6b7280' }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
