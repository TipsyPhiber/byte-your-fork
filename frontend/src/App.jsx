/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import { API_BASE } from './config';

import { useAuth } from './hooks/useAuth';
import { useDarkMode } from './hooks/useDarkMode';
import { useRecipes } from './hooks/useRecipes';
import { useFavorites } from './hooks/useFavorites';
import { useNotifications } from './hooks/useNotifications';

import Auth from './Auth';
import LandingPage from './LandingPage';
import About from './About';
import Settings from './Settings';
import AddRecipe from './AddRecipe';

import BottomNav from './components/BottomNav';
import RecipeModal from './components/RecipeModal';
import ResetPasswordForm from './components/ResetPasswordForm';

import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import Favorites from './pages/Favorites';
import Notifications from './pages/Notifications';

const BASE = `${API_BASE}/api`;

function App() {
  const { token, user, setUser, login, logout } = useAuth();
  const [dark, setDark] = useDarkMode();
  const [view, setView] = useState(() => token ? 'dashboard' : 'landing');

  const { recipes, selectedRecipe, fetchRecipes, openRecipe, closeRecipe, updateRecipeRating } = useRecipes(token);
  const { favoritedIds, favoriteRecipes, fetchFavorites, toggleFavorite } = useFavorites(token);
  const { visibleNotifs, setClearedAt, fetchNotifications, handleClearNotifications, handleDismissNotification } = useNotifications(token);

  useEffect(() => {
    if (!token) setView('landing');
  }, [token]);

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

  const handleToggleFavorite = useCallback((e, recipeId) => {
    toggleFavorite(e, recipeId, recipes);
  }, [toggleFavorite, recipes]);

  const handleDelete = useCallback(async (id) => {
    try {
      await axios.delete(`${BASE}/recipes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      closeRecipe();
      fetchRecipes();
      fetchFavorites();
    } catch { /* silently fail — modal already shows error state */ }
  }, [token, closeRecipe, fetchRecipes, fetchFavorites]);

  // Auth / pre-login screens
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
    if (view === 'login')  return <Auth {...authProps} initialTab="login" />;
    if (view === 'signup') return <Auth {...authProps} initialTab="signup" />;
    if (view === 'about')  return <About onHome={() => setView('landing')} />;
    return <LandingPage onLogin={() => setView('login')} onSignUp={() => setView('signup')} onAbout={() => setView('about')} />;
  }

  return (
    <div className="app-container">
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>
      <main className="main-content">
        <div className="content-area">
          {view === 'dashboard'     && <Dashboard recipes={recipes} user={user} favoritedIds={favoritedIds} onOpen={openRecipe} onToggleFavorite={handleToggleFavorite} />}
          {view === 'explore'       && <Explore recipes={recipes} favoritedIds={favoritedIds} onOpen={openRecipe} onToggleFavorite={handleToggleFavorite} />}
          {view === 'favorites'     && <Favorites favoriteRecipes={favoriteRecipes} favoritedIds={favoritedIds} onOpen={openRecipe} onToggleFavorite={handleToggleFavorite} />}
          {view === 'notifications' && <Notifications visibleNotifs={visibleNotifs} onClear={handleClearNotifications} onDismiss={handleDismissNotification} onOpen={openRecipe} />}
          {view === 'settings'      && <Settings user={user} setUser={setUser} token={token} onPreferencesChange={() => {}} darkMode={dark} setDarkMode={setDark} />}
          {view === 'add-recipe'    && <AddRecipe token={token} onRecipeAdded={() => { goToDashboard(); fetchRecipes(); }} />}
        </div>
      </main>

      <BottomNav
        view={view}
        onNavigate={setView}
        onHome={goToDashboard}
        user={user}
        isAdmin={isAdmin}
        notifCount={visibleNotifs.length}
        onLogout={logout}
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
