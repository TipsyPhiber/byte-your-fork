/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import Auth from './Auth';
import LandingPage from './LandingPage';
import About from './About';
import Settings from './Settings';
import AddRecipe from './AddRecipe';
import logoImg from '../Images/souschef_logo.png';

const API_BASE = 'http://localhost:5000/api';
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1495195129352-aec325a55b65?auto=format&fit=crop&w=600&q=80';

function RecipeGrid({ list, favoritedIds, onOpen, onToggleFavorite }) {
  return (
    <div className="recipe-grid">
      {list.map(r => (
        <div key={r.id} className="recipe-card" onClick={() => onOpen(r.id)}>
          <div style={{ position: 'relative' }}>
            <img className="recipe-card-img" src={r.image_url || FALLBACK_IMG} onError={e => e.target.src = FALLBACK_IMG} alt={r.title} />
            <button className={`heart-btn ${favoritedIds.has(r.id) ? 'favorited' : ''}`} onClick={e => onToggleFavorite(e, r.id)} title={favoritedIds.has(r.id) ? 'Unfavorite' : 'Favorite'}>
              {favoritedIds.has(r.id) ? '❤️' : '🤍'}
            </button>
          </div>
          <div className="recipe-card-info">
            <div>{r.title}</div>
            {r.tag && <div className="recipe-card-tag">{r.tag}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [view, setView] = useState(() => localStorage.getItem('token') ? 'dashboard' : 'landing');
  const [recipes, setRecipes] = useState([]);
  const [activeTag, setActiveTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [favoritedIds, setFavoritedIds] = useState(new Set());
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);

  const fetchRecipes = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/recipes`);
      setRecipes(res.data);
    } catch (err) { console.error('Fetch error', err); }
  }, []);

  const fetchFavorites = useCallback(async (t) => {
    try {
      const [idsRes, recipesRes] = await Promise.all([
        axios.get(`${API_BASE}/favorites/ids`, { headers: { Authorization: `Bearer ${t}` } }),
        axios.get(`${API_BASE}/favorites`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      setFavoritedIds(new Set(idsRes.data));
      setFavoriteRecipes(recipesRes.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    async function init() {
      try {
        const profile = await axios.get(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (isMounted) {
          setUser(profile.data);
          fetchRecipes();
          fetchFavorites(token);
        }
      } catch (err) { if (err.response?.status === 401) { localStorage.removeItem('token'); setToken(null); } }
    }
    init();
    return () => { isMounted = false; };
  }, [token, fetchRecipes, fetchFavorites]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await axios.get(`${API_BASE}/search?query=${encodeURIComponent(searchQuery.trim())}`);
          setSuggestions(res.data);
          setShowSuggestions(true);
        } catch { /* ignore */ }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  const openRecipe = async (id) => {
    setShowSuggestions(false);
    try {
      const res = await axios.get(`${API_BASE}/recipes/${id}`);
      setSelectedRecipe(res.data);
      setEditForm(null);
    } catch { /* ignore */ }
  };

  const toggleFavorite = async (e, recipeId) => {
    e.stopPropagation();
    const isFav = favoritedIds.has(recipeId);
    try {
      if (isFav) {
        await axios.delete(`${API_BASE}/favorites/${recipeId}`, { headers: { Authorization: `Bearer ${token}` } });
        setFavoritedIds(prev => { const s = new Set(prev); s.delete(recipeId); return s; });
        setFavoriteRecipes(prev => prev.filter(r => r.id !== recipeId));
      } else {
        await axios.post(`${API_BASE}/favorites/${recipeId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setFavoritedIds(prev => new Set([...prev, recipeId]));
        const recipe = recipes.find(r => r.id === recipeId);
        if (recipe) setFavoriteRecipes(prev => [...prev, recipe].sort((a, b) => a.title.localeCompare(b.title)));
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recipe? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE}/recipes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedRecipe(null);
      fetchRecipes();
      fetchFavorites(token);
    } catch { alert('Delete failed.'); }
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(`${API_BASE}/recipes/${selectedRecipe.id}`,
        { title: editForm.title, ttc: parseInt(editForm.ttc), ingredients: editForm.ingredients, steps: editForm.steps },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditForm(null);
      await openRecipe(selectedRecipe.id);
      fetchRecipes();
    } catch { alert('Save failed.'); }
  };

  const handleLogout = () => { localStorage.removeItem('token'); setToken(null); setView('landing'); };

  const isAdmin = user?.role === 'admin' || user?.id === 1;

  const allTags = ['All', ...Array.from(new Set(recipes.map(r => r.tag).filter(Boolean))).sort()];
  const filteredRecipes = activeTag === 'All' ? recipes : recipes.filter(r => r.tag === activeTag);

  const closeModal = () => { setSelectedRecipe(null); setEditForm(null); };

  if (!token) {
    const commonProps = { setToken: (t, u) => { setToken(t); setUser(u); setView('dashboard'); localStorage.setItem('token', t); }, onHome: () => setView('landing'), onAbout: () => setView('about') };
    if (view === 'login') return <Auth {...commonProps} initialTab="login" />;
    if (view === 'signup') return <Auth {...commonProps} initialTab="signup" />;
    if (view === 'about') return <About onHome={() => setView('landing')} />;
    return <LandingPage onLogin={() => setView('login')} onSignUp={() => setView('signup')} onHome={() => setView('landing')} onAbout={() => setView('about')} />;
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <img src={logoImg} className="sidebar-logo" onClick={() => setView('dashboard')} alt="Logo" />
        <nav className="sidebar-nav">
          <button className={`nav-icon-button ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')} title="Home">🏠</button>
          <button className={`nav-icon-button ${view === 'explore' ? 'active' : ''}`} onClick={() => setView('explore')} title="Explore">🔍</button>
          <button className={`nav-icon-button ${view === 'favorites' ? 'active' : ''}`} onClick={() => setView('favorites')} title="Favorites">❤️</button>
          {isAdmin && <button className={`nav-icon-button ${view === 'add-recipe' ? 'active' : ''}`} onClick={() => setView('add-recipe')} title="Add Recipe">➕</button>}
          <button className={`nav-icon-button ${view === 'settings' ? 'active' : ''}`} style={{ marginTop: 'auto' }} onClick={() => setView('settings')} title="Settings">⚙️</button>
          <button className="nav-icon-button" onClick={handleLogout} title="Logout">🚪</button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="header-bar">
          <div style={{ flex: 1 }}>
            {view === 'explore' && (
              <div className="search-container">
                <input
                  type="text"
                  className="search-bar"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchQuery.trim().length >= 2 && suggestions.length > 0) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Search recipes..."
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="search-suggestions">
                    {suggestions.map(s => (
                      <div key={s.id} className="suggestion-item" onClick={() => openRecipe(s.id)}>
                        <img src={s.image_url || FALLBACK_IMG} onError={e => e.target.src = FALLBACK_IMG} alt="" />
                        <span>{s.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div onClick={() => setView('settings')} style={{ cursor: 'pointer', fontWeight: 600 }}>Account ▾</div>
        </header>

        <div className="content-area">
          {view === 'settings' && <Settings user={user} setUser={setUser} token={token} />}
          {view === 'add-recipe' && <AddRecipe token={token} onRecipeAdded={() => { setView('dashboard'); fetchRecipes(); }} />}

          {(view === 'dashboard' || view === 'explore') && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: 'var(--dark-blue)' }}>{view === 'dashboard' ? 'Featured Recipes' : 'Explore All'}</h2>
              </div>
              <div className="tag-filter">
                {allTags.map(tag => (
                  <button key={tag} className={`tag-pill ${activeTag === tag ? 'active' : ''}`} onClick={() => setActiveTag(tag)}>{tag}</button>
                ))}
              </div>
              <RecipeGrid list={filteredRecipes} favoritedIds={favoritedIds} onOpen={openRecipe} onToggleFavorite={toggleFavorite} />
            </div>
          )}

          {view === 'favorites' && (
            <div>
              <h2 style={{ marginBottom: '20px', color: 'var(--dark-blue)' }}>Your Favorites</h2>
              {favoriteRecipes.length === 0
                ? <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-light)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🤍</div>
                    <p>No favorites yet — heart a recipe to save it here.</p>
                  </div>
                : <RecipeGrid list={favoriteRecipes} favoritedIds={favoritedIds} onOpen={openRecipe} onToggleFavorite={toggleFavorite} />
              }
            </div>
          )}
        </div>
      </main>

      {selectedRecipe && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeModal}>✕</button>

            {editForm ? (
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
                      <input className="edit-input" style={{ flex: 2 }} value={ing.name} onChange={e => { const ings = [...editForm.ingredients]; ings[i] = { ...ings[i], name: e.target.value }; setEditForm({ ...editForm, ingredients: ings }); }} placeholder="Ingredient" />
                      <input className="edit-input" style={{ flex: 1 }} value={ing.amount} onChange={e => { const ings = [...editForm.ingredients]; ings[i] = { ...ings[i], amount: e.target.value }; setEditForm({ ...editForm, ingredients: ings }); }} placeholder="Amount" />
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
                      <textarea className="edit-input" style={{ flex: 1, minHeight: '70px', resize: 'vertical' }} value={step} onChange={e => { const steps = [...editForm.steps]; steps[i] = e.target.value; setEditForm({ ...editForm, steps }); }} />
                      <button onClick={() => setEditForm({ ...editForm, steps: editForm.steps.filter((_, j) => j !== i) })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', paddingTop: '8px' }}>🗑️</button>
                    </div>
                  ))}
                  <button className="tag-pill" onClick={() => setEditForm({ ...editForm, steps: [...editForm.steps, ''] })}>+ Add Step</button>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="primary-button" onClick={handleSaveEdit}>Save Changes</button>
                  <button className="primary-button" style={{ background: '#6b7280' }} onClick={() => setEditForm(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <img className="modal-hero" src={selectedRecipe.image_url || FALLBACK_IMG} onError={e => e.target.src = FALLBACK_IMG} alt="" />
                <div className="modal-scroll">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h1 style={{ fontSize: '2.5rem', color: 'var(--dark-blue)', margin: 0 }}>{selectedRecipe.title}</h1>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '16px', paddingTop: '8px' }}>
                      <button
                        className={`heart-btn ${favoritedIds.has(selectedRecipe.id) ? 'favorited' : ''}`}
                        style={{ position: 'static', fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={e => toggleFavorite(e, selectedRecipe.id)}
                        title={favoritedIds.has(selectedRecipe.id) ? 'Unfavorite' : 'Save to Favorites'}
                      >
                        {favoritedIds.has(selectedRecipe.id) ? '❤️' : '🤍'}
                      </button>
                      {isAdmin && (
                        <>
                          <button className="tag-pill" onClick={() => setEditForm({ title: selectedRecipe.title, ttc: selectedRecipe.ttc, ingredients: selectedRecipe.ingredients || [], steps: selectedRecipe.steps || [] })}>Edit</button>
                          <button className="tag-pill" style={{ background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }} onClick={() => handleDelete(selectedRecipe.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="recipe-meta">
                    <span>⏱️ {selectedRecipe.ttc} mins</span>
                    <span>👨‍🍳 Admin</span>
                    {selectedRecipe.tag && <span>🍽️ {selectedRecipe.tag}</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                    <div>
                      <h3 className="recipe-section-title">Ingredients</h3>
                      <ul style={{ paddingLeft: '20px', lineHeight: '2' }}>
                        {selectedRecipe.ingredients?.map((ing, i) => (
                          <li key={i}><strong>{ing.amount}</strong> {ing.name}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="recipe-section-title">Instructions</h3>
                      <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                        {selectedRecipe.steps?.map((s, i) => <li key={i} style={{ marginBottom: '15px' }}>{s}</li>)}
                      </ol>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
