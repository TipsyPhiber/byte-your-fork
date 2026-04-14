/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import { API_BASE } from './config';

import { useAuth } from './hooks/useAuth';
import { useRecipes } from './hooks/useRecipes';
import { useFavorites } from './hooks/useFavorites';
import { useNotifications } from './hooks/useNotifications';

import Auth from './Auth';
import LandingPage from './LandingPage';
import About from './About';
import Settings from './Settings';
import AddRecipe from './AddRecipe';

import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import SearchBar from './components/SearchBar';
import RecipeModal from './components/RecipeModal';
import ResetPasswordForm from './components/ResetPasswordForm';

import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import Favorites from './pages/Favorites';
import Notifications from './pages/Notifications';

const BASE = `${API_BASE}/api`;

function App() {
  const { token, user, setUser, login, logout } = useAuth();
  const [view, setView] = useState(() => token ? 'dashboard' : 'landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { recipes, selectedRecipe, fetchRecipes, openRecipe, closeRecipe, updateRecipeRating } = useRecipes(token);
  const { favoritedIds, favoriteRecipes, fetchFavorites, toggleFavorite } = useFavorites(token);
  const { visibleNotifs, setClearedAt, fetchNotifications, handleClearNotifications, handleDismissNotification } = useNotifications(token);

  // Reset view to landing when token is cleared (logout or inactivity)
  useEffect(() => {
    if (!token) setView('landing');
  }, [token]);

  // Bootstrap user data after login
  useEffect(() => {
    if (!token) return;
    let mounted = true;
    async function init() {
      try {
        const res = await axios.get(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!mounted) return;
        setUser(res.data);
        setClearedAt(res.data.notifications_cleared_at || null);
        fetchRecipes();
        fetchFavorites();
        fetchNotifications();
      } catch (err) {
        if (err.response?.status === 401) logout();
      }
    }
    init();
    return () => { mounted = false; };
  }, [token]);

  const goToDashboard = useCallback(() => setView('dashboard'), []);
  const isAdmin = user?.role === 'admin';

  // Coordinator: toggleFavorite needs the full recipe list for optimistic add
  const handleToggleFavorite = useCallback((e, recipeId) => {
    toggleFavorite(e, recipeId, recipes);
  }, [toggleFavorite, recipes]);

  // Coordinator: delete touches both recipes and favorites
  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this recipe? This cannot be undone.')) return;
    try {
      await axios.delete(`${BASE}/recipes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      closeRecipe();
      fetchRecipes();
      fetchFavorites();
    } catch { alert('Delete failed.'); }
  }, [token, closeRecipe, fetchRecipes, fetchFavorites]);

  // Handle password reset link (?reset_token=xxx) before rendering anything else
  if (!token) {
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

    const authProps = {
      setToken: (t) => { login(t); setView('dashboard'); },
      onHome: () => setView('landing'),
      onAbout: () => setView('about'),
    };
    if (view === 'login') return <Auth {...authProps} initialTab="login" />;
    if (view === 'signup') return <Auth {...authProps} initialTab="signup" />;
    if (view === 'about') return <About onHome={() => setView('landing')} />;
    return <LandingPage onLogin={() => setView('login')} onSignUp={() => setView('signup')} onAbout={() => setView('about')} />;
  }

  return (
    <div className="app-container">
      <Sidebar
        view={view}
        onNavigate={setView}
        onHome={goToDashboard}
        user={user}
        isAdmin={isAdmin}
        notifCount={visibleNotifs.length}
        onLogout={logout}
      />

      <main className="main-content">
        <header className="header-bar">
          <button className="hamburger-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
          <div style={{ flex: 1 }}>
            {view === 'explore' && <SearchBar onSelect={openRecipe} />}
          </div>
          <div onClick={() => setView('settings')} style={{ cursor: 'pointer', fontWeight: 600 }}>@{user?.username} ▾</div>
        </header>

        <div className="content-area">
          {view === 'settings' && <Settings user={user} setUser={setUser} token={token} onPreferencesChange={() => {}} />}
          {view === 'add-recipe' && <AddRecipe token={token} onRecipeAdded={() => { goToDashboard(); fetchRecipes(); }} />}
          {view === 'dashboard' && <Dashboard recipes={recipes} user={user} favoritedIds={favoritedIds} onOpen={openRecipe} onToggleFavorite={handleToggleFavorite} />}
          {view === 'explore' && <Explore recipes={recipes} favoritedIds={favoritedIds} onOpen={openRecipe} onToggleFavorite={handleToggleFavorite} />}
          {view === 'favorites' && <Favorites favoriteRecipes={favoriteRecipes} favoritedIds={favoritedIds} onOpen={openRecipe} onToggleFavorite={handleToggleFavorite} />}
          {view === 'notifications' && <Notifications visibleNotifs={visibleNotifs} onClear={handleClearNotifications} onDismiss={handleDismissNotification} onOpen={openRecipe} />}
        </div>
      </main>

      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        view={view}
        onNavigate={(v) => { setView(v); setMobileMenuOpen(false); }}
        onHome={() => { goToDashboard(); setMobileMenuOpen(false); }}
        user={user}
        isAdmin={isAdmin}
        notifCount={visibleNotifs.length}
        onLogout={() => { logout(); setMobileMenuOpen(false); }}
      />

      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          token={token}
          user={user}
          isAdmin={isAdmin}
          favoritedIds={favoritedIds}
          onClose={closeRecipe}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleDelete}
          onRatingUpdate={updateRecipeRating}
          onRecipeSaved={() => { openRecipe(selectedRecipe.id); fetchRecipes(); }}
        />
      )}
    </div>
  );
}

export default App;
