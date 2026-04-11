/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import './App.css';
import Auth from './Auth';
import LandingPage from './LandingPage';
import About from './About';
import Settings from './Settings';
import AddRecipe from './AddRecipe';
import CookMode from './CookMode';
import logoImg from '../Images/souschef_logo.png';

function ResetPasswordForm({ token, onDone }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) return setError("Passwords don't match.");
    if (newPassword.length < 8) return setError("Password must be at least 8 characters.");
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/reset-password', { token, newPassword });
      setStatus(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
      <div className="auth-card" style={{ boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <h2>Set New Password</h2>
        {status ? (
          <>
            <p style={{ textAlign: 'center', color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', fontSize: '0.9rem' }}>{status}</p>
            <p className="toggle-text" style={{ marginTop: '16px' }}>
              <span onClick={onDone} className="toggle-link" style={{ color: '#6366f1' }}>Go to Login →</span>
            </p>
          </>
        ) : (
          <>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleSubmit} className="auth-form">
              <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              <button type="submit" className="primary-button" style={{ backgroundColor: '#6366f1' }} disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {r.tag && <div className="recipe-card-tag">{r.tag}</div>}
              {parseFloat(r.avg_rating) > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                  ⭐ {parseFloat(r.avg_rating).toFixed(1)}
                </div>
              )}
            </div>
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
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [ratingData, setRatingData] = useState({ average: 0, count: 0, userRating: null });
  const [hoverRating, setHoverRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [cookMode, setCookMode] = useState(false);
  const [favoritedIds, setFavoritedIds] = useState(new Set());
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [clearedAt, setClearedAt] = useState(null);

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

  const fetchNotifications = useCallback(async (t) => {
    try {
      const res = await axios.get(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${t}` } });
      setNotifications(res.data);
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
          setClearedAt(profile.data.notifications_cleared_at || null);
          const prefs = profile.data.preferences || [];
          setActiveTag(prefs.length > 0 ? prefs[0] : 'All');
          fetchRecipes();
          fetchFavorites(token);
          fetchNotifications(token);
        }
      } catch (err) { if (err.response?.status === 401) { localStorage.removeItem('token'); setToken(null); } }
    }
    init();
    return () => { isMounted = false; };
  }, [token, fetchRecipes, fetchFavorites, fetchNotifications]);

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
    setComments([]);
    setNewComment('');
    setRatingData({ average: 0, count: 0, userRating: null });
    try {
      const [recipeRes, commentsRes] = await Promise.all([
        axios.get(`${API_BASE}/recipes/${id}`),
        axios.get(`${API_BASE}/comments/${id}`)
      ]);
      setSelectedRecipe(recipeRes.data);
      setComments(commentsRes.data);
      setEditForm(null);
      if (token) {
        const [ratingRes] = await Promise.all([
          axios.get(`${API_BASE}/ratings/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.post(`${API_BASE}/recipes/${id}/view`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
        ]);
        setRatingData(ratingRes.data);
      }
    } catch { /* ignore */ }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await axios.post(`${API_BASE}/comments/${selectedRecipe.id}`, { text: newComment }, { headers: { Authorization: `Bearer ${token}` } });
      setComments(prev => [res.data, ...prev]);
      setNewComment('');
    } catch { /* ignore */ }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${API_BASE}/comments/${commentId}`, { headers: { Authorization: `Bearer ${token}` } });
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { /* ignore */ }
  };

  const handleRate = async (rating) => {
    try {
      const res = await axios.post(`${API_BASE}/ratings/${selectedRecipe.id}`, { rating }, { headers: { Authorization: `Bearer ${token}` } });
      setRatingData(res.data);
      // Update the card in the recipe list without a full refetch
      setRecipes(prev => prev.map(r => r.id === selectedRecipe.id
        ? { ...r, avg_rating: res.data.average, rating_count: res.data.count }
        : r
      ));
      setFavoriteRecipes(prev => prev.map(r => r.id === selectedRecipe.id
        ? { ...r, avg_rating: res.data.average, rating_count: res.data.count }
        : r
      ));
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

  const handleLogout = useCallback(() => { localStorage.removeItem('token'); setToken(null); setUser(null); setActiveTag('All'); setView('landing'); }, []);

  const inactivityTimer = useRef(null);
  useEffect(() => {
    if (!token) return;
    const reset = () => {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(handleLogout, 15 * 60 * 1000);
    };
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(ev => document.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      events.forEach(ev => document.removeEventListener(ev, reset));
      clearTimeout(inactivityTimer.current);
    };
  }, [token, handleLogout]);

  const goToDashboard = () => {
    const prefs = user?.preferences || [];
    setActiveTag(prefs.length > 0 ? prefs[0] : 'All');
    setView('dashboard');
  };

  const isAdmin = user?.role === 'admin';

  const handleClearNotifications = async () => {
    try {
      const res = await axios.put(`${API_BASE}/auth/clear-notifications`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setClearedAt(res.data.cleared_at);
    } catch { /* ignore */ }
  };

  const handleDismissNotification = async (e, recipeId) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_BASE}/notifications/${recipeId}`, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.filter(n => n.id !== recipeId));
    } catch { /* ignore */ }
  };

  const visibleNotifs = clearedAt
    ? notifications.filter(n => new Date(n.creation_date) > new Date(clearedAt))
    : notifications;

  const allTags = ['All', ...Array.from(new Set(recipes.map(r => r.tag).filter(Boolean))).sort()];
  const filteredRecipes = activeTag === 'All' ? recipes : recipes.filter(r => r.tag === activeTag);

  const featuredRecipes = useMemo(() => {
    const prefs = user?.preferences || [];
    let pool = prefs.length > 0 ? recipes.filter(r => prefs.includes(r.tag)) : recipes;
    if (pool.length === 0) pool = recipes;
    return [...pool]
      .sort((a, b) => (parseFloat(b.avg_rating) || 0) - (parseFloat(a.avg_rating) || 0))
      .slice(0, 24);
  }, [recipes, user?.preferences]);

  const closeModal = () => { setSelectedRecipe(null); setEditForm(null); setCookMode(false); };

  if (!token) {
    // Handle password reset link: ?reset_token=xxx
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('reset_token');
    if (resetToken) {
      return (
        <ResetPasswordForm
          token={resetToken}
          onDone={() => {
            window.history.replaceState({}, '', window.location.pathname);
            setView('login');
          }}
        />
      );
    }

    const commonProps = { setToken: (t, u) => { setToken(t); setUser(u); setView('dashboard'); localStorage.setItem('token', t); }, onHome: () => setView('landing'), onAbout: () => setView('about') };
    if (view === 'login') return <Auth {...commonProps} initialTab="login" />;
    if (view === 'signup') return <Auth {...commonProps} initialTab="signup" />;
    if (view === 'about') return <About onHome={() => setView('landing')} />;
    return <LandingPage onLogin={() => setView('login')} onSignUp={() => setView('signup')} onHome={() => setView('landing')} onAbout={() => setView('about')} />;
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <img src={logoImg} className="sidebar-logo" onClick={goToDashboard} alt="Logo" />
        <div onClick={() => setView('settings')} title={user?.username} style={{ cursor: 'pointer', margin: '0 auto 8px', width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary-blue)', flexShrink: 0 }}>
          {user?.avatar_url
            ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
                {user?.first_name?.[0]?.toUpperCase() || '?'}
              </div>
          }
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-icon-button ${view === 'dashboard' ? 'active' : ''}`} onClick={goToDashboard} title="Home">🏠</button>
          <button className={`nav-icon-button ${view === 'explore' ? 'active' : ''}`} onClick={() => setView('explore')} title="Explore">🔍</button>
          <button className={`nav-icon-button ${view === 'favorites' ? 'active' : ''}`} onClick={() => setView('favorites')} title="Favorites">❤️</button>
          <button className={`nav-icon-button ${view === 'notifications' ? 'active' : ''}`} onClick={() => setView('notifications')} title="Notifications" style={{ position: 'relative' }}>
            🔔
            {visibleNotifs.length > 0 && <span className="notif-badge">{visibleNotifs.length}</span>}
          </button>
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
          <div onClick={() => setView('settings')} style={{ cursor: 'pointer', fontWeight: 600 }}>@{user?.username} ▾</div>
        </header>

        <div className="content-area">
          {view === 'settings' && <Settings user={user} setUser={setUser} token={token} onPreferencesChange={() => {}} />}
          {view === 'add-recipe' && <AddRecipe token={token} onRecipeAdded={() => { goToDashboard(); fetchRecipes(); }} />}

          {view === 'dashboard' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: 0, color: 'var(--dark-blue)' }}>
                  {user?.preferences?.length > 0 ? 'Recommended For You' : 'Top Rated Recipes'}
                </h2>
                <p style={{ margin: '6px 0 0', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                  {user?.preferences?.length > 0
                    ? `Based on your ${user.preferences.join(', ')} preferences, sorted by rating`
                    : 'The highest rated recipes across all cuisines'}
                </p>
              </div>
              <RecipeGrid list={featuredRecipes} favoritedIds={favoritedIds} onOpen={openRecipe} onToggleFavorite={toggleFavorite} />
            </div>
          )}

          {view === 'explore' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: 'var(--dark-blue)' }}>Explore All Recipes</h2>
              </div>
              <div className="tag-filter">
                {allTags.map(tag => (
                  <button key={tag} className={`tag-pill ${activeTag === tag ? 'active' : ''}`} onClick={() => setActiveTag(tag)}>{tag}</button>
                ))}
              </div>
              <RecipeGrid list={filteredRecipes} favoritedIds={favoritedIds} onOpen={openRecipe} onToggleFavorite={toggleFavorite} />
            </div>
          )}

          {view === 'notifications' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ margin: 0, color: 'var(--dark-blue)' }}>Recent Additions</h2>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-light)', fontSize: '0.9rem' }}>Recipes added in the last 30 days</p>
                </div>
                {visibleNotifs.length > 0 && (
                  <button className="tag-pill" onClick={handleClearNotifications}>Clear All</button>
                )}
              </div>

              {visibleNotifs.length === 0
                ? <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-light)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔔</div>
                    <p style={{ margin: 0, fontWeight: 600 }}>You're all caught up!</p>
                    <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>No new recipes since you last checked.</p>
                  </div>
                : <div className="notif-grid">
                    {visibleNotifs.map(n => (
                      <div key={n.id} className="notif-card" onClick={() => openRecipe(n.id)}>
                        <img src={n.image_url || FALLBACK_IMG} onError={e => e.target.src = FALLBACK_IMG} alt="" className="notif-img" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--dark-blue)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                            {n.tag && <span style={{ marginRight: '10px' }}>🍽️ {n.tag}</span>}
                            <span>Added {new Date(n.creation_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className="notif-new-badge">NEW</span>
                        <button className="notif-dismiss" onClick={e => handleDismissNotification(e, n.id)} title="Dismiss">✕</button>
                      </div>
                    ))}
                  </div>
              }
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

      {cookMode && selectedRecipe && (
        <CookMode
          recipe={selectedRecipe}
          token={token}
          onExit={() => setCookMode(false)}
        />
      )}

      {selectedRecipe && !cookMode && (
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
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '16px', paddingTop: '8px', alignItems: 'center' }}>
                      <button
                        className={`heart-btn ${favoritedIds.has(selectedRecipe.id) ? 'favorited' : ''}`}
                        style={{ position: 'static', fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={e => toggleFavorite(e, selectedRecipe.id)}
                        title={favoritedIds.has(selectedRecipe.id) ? 'Unfavorite' : 'Save to Favorites'}
                      >
                        {favoritedIds.has(selectedRecipe.id) ? '❤️' : '🤍'}
                      </button>
                      <button className="primary-button" style={{ padding: '10px 20px', fontSize: '0.9rem' }} onClick={() => setCookMode(true)}>
                        👨‍🍳 Cook Mode
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
                    {selectedRecipe.view_count > 0 && <span>👁️ {selectedRecipe.view_count} {parseInt(selectedRecipe.view_count) === 1 ? 'view' : 'views'}</span>}
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

                  {/* Rating */}
                  <div style={{ marginTop: '32px' }}>
                    <h3 className="recipe-section-title">
                      Rate This Recipe
                      {ratingData.count > 0 && <span style={{ fontWeight: 400, fontSize: '0.9rem', color: 'var(--text-light)', marginLeft: '12px' }}>
                        {ratingData.average} / 5 ({ratingData.count} {ratingData.count === 1 ? 'rating' : 'ratings'})
                      </span>}
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
                    {ratingData.userRating && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)' }}>Your rating: {ratingData.userRating} / 5</p>}
                  </div>

                  {/* Comments */}
                  <div style={{ marginTop: '32px' }}>
                    <h3 className="recipe-section-title">Comments ({comments.length})</h3>
                    <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                      <input
                        className="edit-input"
                        style={{ flex: 1 }}
                        placeholder="Leave a comment..."
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        maxLength={255}
                      />
                      <button type="submit" className="primary-button" style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>Post</button>
                    </form>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {comments.length === 0 && <p style={{ color: 'var(--text-light)', margin: 0 }}>No comments yet — be the first!</p>}
                      {comments.map(c => (
                        <div key={c.id} style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px 16px', border: '1px solid #eee' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--dark-blue)', fontSize: '0.9rem' }}>{c.username || c.first_name}</span>
                              <span style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginLeft: '10px' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                            </div>
                            {(user?.id === c.user_id || isAdmin) && (
                              <button onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.8rem' }}>✕</button>
                            )}
                          </div>
                          <p style={{ margin: '6px 0 0', color: '#374151', fontSize: '0.95rem' }}>{c.text}</p>
                        </div>
                      ))}
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
