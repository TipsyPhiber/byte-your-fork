/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const { recipes, selectedRecipe, fetchRecipes, openRecipe, closeRecipe, updateRecipeRating } = useRecipes(token);
  const { favoritedIds, favoriteRecipes, fetchFavorites, toggleFavorite } = useFavorites(token);
  const { visibleNotifs, setClearedAt, fetchNotifications, handleClearNotifications, handleDismissNotification } = useNotifications(token);

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

  const handleLogout = useCallback(() => { logout(); navigate('/'); }, [logout, navigate]);
  const isAdmin = user?.role === 'admin';

  // Reset-password link from email (?reset_token=...) — pre-empts auth flow
  if (!token) {
    const resetToken = new URLSearchParams(window.location.search).get('reset_token');
    if (resetToken) {
      return (
        <ResetPasswordForm
          token={resetToken}
          onDone={() => {
            window.history.replaceState({}, '', window.location.pathname);
            navigate('/login');
          }}
        />
      );
    }

    const authProps = {
      setToken: (t) => { login(t); navigate('/dashboard'); },
      onHome: () => navigate('/'),
      onAbout: () => navigate('/about'),
    };
    return (
      <Routes>
        <Route path="/login" element={<Auth {...authProps} initialTab="login" />} />
        <Route path="/signup" element={<Auth {...authProps} initialTab="signup" />} />
        <Route path="/about" element={<About onHome={() => navigate('/')} />} />
        <Route path="*" element={<LandingPage onLogin={() => navigate('/login')} onSignUp={() => navigate('/signup')} onAbout={() => navigate('/about')} />} />
      </Routes>
    );
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
          <Routes>
            <Route path="/dashboard" element={<Dashboard recipes={recipes} user={user} favoritedIds={favoritedIds} onOpen={openRecipe} onToggleFavorite={handleToggleFavorite} />} />
            <Route path="/explore" element={<Explore recipes={recipes} favoritedIds={favoritedIds} onOpen={openRecipe} onToggleFavorite={handleToggleFavorite} />} />
            <Route path="/favorites" element={<Favorites favoriteRecipes={favoriteRecipes} favoritedIds={favoritedIds} onOpen={openRecipe} onToggleFavorite={handleToggleFavorite} />} />
            <Route path="/notifications" element={<Notifications visibleNotifs={visibleNotifs} onClear={handleClearNotifications} onDismiss={handleDismissNotification} onOpen={openRecipe} />} />
            <Route path="/settings" element={<Settings user={user} setUser={setUser} token={token} onPreferencesChange={() => {}} darkMode={dark} setDarkMode={setDark} />} />
            <Route path="/add-recipe" element={<AddRecipe token={token} onRecipeAdded={() => { navigate('/dashboard'); fetchRecipes(); }} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>

      <BottomNav
        user={user}
        isAdmin={isAdmin}
        notifCount={visibleNotifs.length}
        onLogout={handleLogout}
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
