import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from './config';
import { Trash2, CheckCircle } from 'lucide-react';

const AddRecipe = ({ token, onRecipeAdded }) => {
  const [title, setTitle] = useState('');
  const [ttc, setTtc] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', amount: '' }]);
  const [steps, setSteps] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleIngredientChange = (index, field, value) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  const handleStepChange = (index, value) => {
    const updated = [...steps];
    updated[index] = value;
    setSteps(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      // Ensure each step ends with terminal punctuation so the cleanSteps
      // header-detection heuristic on read doesn't drop short user-typed steps.
      const normalizedSteps = steps
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => /[.!?:]$/.test(s) ? s : `${s}.`);
      await axios.post(
        `${API_BASE}/api/recipes`,
        { title, ttc: parseInt(ttc), imageUrl, ingredients, steps: normalizedSteps },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onRecipeAdded();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
      <h2 style={{ color: 'var(--dark-blue)', marginBottom: '8px' }}>Add New Recipe</h2>
      <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', margin: '0 0 28px' }}>Fill in the details below to publish a recipe.</p>

      {error && <p className="error-message">{error}</p>}
      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#16a34a', fontWeight: 600 }}>
          <CheckCircle size={18} /> Recipe published successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Basic Info */}
        <div className="settings-card" style={{ padding: '28px', borderRadius: '14px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '18px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>Basic Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text" className="edit-input"
              placeholder="Recipe title"
              value={title} onChange={e => setTitle(e.target.value)} required
            />
            <input
              type="number" className="edit-input"
              placeholder="Cook time (minutes)"
              value={ttc} onChange={e => setTtc(e.target.value)} required
            />
            <input
              type="url" className="edit-input"
              placeholder="Image URL (optional)"
              value={imageUrl} onChange={e => setImageUrl(e.target.value)}
            />
          </div>
        </div>

        {/* Ingredients */}
        <div className="settings-card" style={{ padding: '28px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>Ingredients</h3>
            <button type="button" className="primary-button" style={{ padding: '6px 14px', fontSize: '0.82rem' }} onClick={() => setIngredients([...ingredients, { name: '', amount: '' }])}>
              + Add
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ingredients.map((ing, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text" className="edit-input"
                  style={{ flex: 2 }}
                  placeholder="Ingredient name"
                  value={ing.name} onChange={e => handleIngredientChange(idx, 'name', e.target.value)} required
                />
                <input
                  type="text" className="edit-input"
                  style={{ flex: 1 }}
                  placeholder="Amount"
                  value={ing.amount} onChange={e => handleIngredientChange(idx, 'amount', e.target.value)} required
                />
                {ingredients.length > 1 && (
                  <button type="button" onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '6px', flexShrink: 0, transition: 'color 0.15s' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="settings-card" style={{ padding: '28px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>Instructions</h3>
            <button type="button" className="primary-button" style={{ padding: '6px 14px', fontSize: '0.82rem' }} onClick={() => setSteps([...steps, ''])}>
              + Add Step
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {steps.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ paddingTop: '10px', fontWeight: 700, color: 'var(--accent)', minWidth: '22px', fontSize: '0.85rem' }}>{idx + 1}.</span>
                <textarea
                  className="edit-input"
                  style={{ flex: 1, minHeight: '80px', resize: 'vertical' }}
                  placeholder="Describe this step..."
                  value={step} onChange={e => handleStepChange(idx, e.target.value)} required
                />
                {steps.length > 1 && (
                  <button type="button" onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '6px', flexShrink: 0, paddingTop: '12px', transition: 'color 0.15s' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="primary-button" style={{ padding: '14px', fontSize: '1rem', justifyContent: 'center' }} disabled={loading}>
          {loading ? 'Publishing...' : 'Publish Recipe'}
        </button>
      </form>
    </div>
  );
};

export default AddRecipe;
