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

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [view, setView] = useState(() => localStorage.getItem('token') ? 'dashboard' : 'landing');
  const [recipes, setRecipes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchRecipes = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/recipes`);
      setRecipes(res.data);
    } catch (err) { console.error('Fetch error', err); }
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
        }
      } catch (err) { if (err.response?.status === 401) { localStorage.removeItem('token'); setToken(null); } }
    }
    init();
    return () => { isMounted = false; };
  }, [token, fetchRecipes]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await axios.get(`${API_BASE}/search?query=${encodeURIComponent(searchQuery.trim())}`);
          setSuggestions(res.data);
          setShowSuggestions(true);
        } catch (e) { console.error('Suggest error', e); }
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
    } catch (e) { console.error('Open error', e); }
  };

  const handleLogout = () => { localStorage.removeItem('token'); setToken(null); setView('landing'); };

  const isAdmin = user?.role === 'admin' || user?.id === 1;

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
          <button className={`nav-icon-button ${view === 'notifications' ? 'active' : ''}`} onClick={() => setView('notifications')} title="Notifications">🔔</button>
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
          <div onClick={() => setView('settings')} style={{ cursor: 'pointer', fontWeight: 600 }}>Account V</div>
        </header>

        <div className="content-area">
          {view === 'settings' && <Settings user={user} setUser={setUser} token={token} />}
          {view === 'add-recipe' && <AddRecipe token={token} onRecipeAdded={() => { setView('dashboard'); fetchRecipes(); }} />}
          {(view === 'dashboard' || view === 'explore') && (
            <div>
              <h2 style={{ marginBottom: '30px', color: 'var(--dark-blue)' }}>{view === 'dashboard' ? 'Featured Recipes' : 'Explore All'}</h2>
              <div className="recipe-grid">
                {recipes.map(r => (
                  <div key={r.id} className="recipe-card" onClick={() => openRecipe(r.id)}>
                    <img className="recipe-card-img" src={r.image_url || FALLBACK_IMG} onError={e => e.target.src = FALLBACK_IMG} alt={r.title} />
                    <div className="recipe-card-info">{r.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {view === 'notifications' && <div style={{ textAlign: 'center', padding: '50px' }}><h2>Notifications</h2><p>No new notifications.</p></div>}
        </div>
      </main>

      {selectedRecipe && (
        <div className="modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedRecipe(null)}>✕</button>
            <img className="modal-hero" src={selectedRecipe.image_url || FALLBACK_IMG} onError={e => e.target.src = FALLBACK_IMG} alt="" />
            <div className="modal-scroll">
              <h1 style={{ fontSize: '2.5rem', color: 'var(--dark-blue)', margin: '0 0 10px 0' }}>{selectedRecipe.title}</h1>
              <div className="recipe-meta">
                <span>⏱️ {selectedRecipe.ttc} mins</span>
                <span>👨‍🍳 Admin</span>
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
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
