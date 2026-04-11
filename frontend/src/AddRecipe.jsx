import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from './config';

const AddRecipe = ({ token, onRecipeAdded }) => {
  const [title, setTitle] = useState('');
  const [ttc, setTtc] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', amount: '' }]);
  const [steps, setSteps] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: '' }]);
  };

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;
    setIngredients(newIngredients);
  };

  const handleRemoveIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleAddStep = () => {
    setSteps([...steps, '']);
  };

  const handleStepChange = (index, value) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const handleRemoveStep = (index) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API_BASE}/api/recipes`,
        { title, ttc: parseInt(ttc), imageUrl, ingredients, steps },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Recipe added successfully!');
      onRecipeAdded();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add recipe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
      <h2 style={{ color: 'var(--dark-blue)', marginBottom: '30px' }}>Add New Recipe</h2>
      
      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Basic Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="text" 
              className="search-bar" 
              style={{ paddingLeft: '15px' }}
              placeholder="Recipe Title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required 
            />
            <input 
              type="number" 
              className="search-bar" 
              style={{ paddingLeft: '15px' }}
              placeholder="Time to Cook (minutes)" 
              value={ttc} 
              onChange={(e) => setTtc(e.target.value)} 
              required 
            />
            <input 
              type="url" 
              className="search-bar" 
              style={{ paddingLeft: '15px' }}
              placeholder="Image URL (optional)" 
              value={imageUrl} 
              onChange={(e) => setImageUrl(e.target.value)} 
            />
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Ingredients</h3>
            <button type="button" className="primary-button" style={{ padding: '5px 15px', fontSize: '0.8rem' }} onClick={handleAddIngredient}>+ Add</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ingredients.map((ing, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="search-bar" 
                  style={{ paddingLeft: '15px', flex: 2 }}
                  placeholder="Ingredient Name" 
                  value={ing.name} 
                  onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)} 
                  required 
                />
                <input 
                  type="text" 
                  className="search-bar" 
                  style={{ paddingLeft: '15px', flex: 1 }}
                  placeholder="Amount (e.g. 2 cups)" 
                  value={ing.amount} 
                  onChange={(e) => handleIngredientChange(idx, 'amount', e.target.value)} 
                  required 
                />
                {ingredients.length > 1 && (
                  <button type="button" onClick={() => handleRemoveIngredient(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🗑️</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Instructions</h3>
            <button type="button" className="primary-button" style={{ padding: '5px 15px', fontSize: '0.8rem' }} onClick={handleAddStep}>+ Add Step</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {steps.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ marginTop: '10px', fontWeight: 'bold', color: 'var(--primary-blue)' }}>{idx + 1}.</span>
                <textarea 
                  className="search-bar" 
                  style={{ padding: '10px 15px', flex: 1, minHeight: '80px', resize: 'vertical' }}
                  placeholder="Describe this step..." 
                  value={step} 
                  onChange={(e) => handleStepChange(idx, e.target.value)} 
                  required 
                />
                {steps.length > 1 && (
                  <button type="button" onClick={() => handleRemoveStep(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', marginTop: '10px' }}>🗑️</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="primary-button" style={{ padding: '15px', fontSize: '1.1rem' }} disabled={loading}>
          {loading ? 'Adding Recipe...' : 'Save Recipe'}
        </button>
      </form>
    </div>
  );
};

export default AddRecipe;
