import { useState, useCallback } from 'react';
import { api } from '../api';
import { normalizeRowImage } from '../config';

export function useRecipes(token) {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const fetchRecipes = useCallback(async () => {
    try {
      const res = await api.get('/recipes');
      setRecipes(res.data.map(normalizeRowImage));
    } catch (err) {
      console.error('Fetch error', err);
    }
  }, []);

  const openRecipe = useCallback(async (id) => {
    try {
      const res = await api.get(`/recipes/${id}`);
      setSelectedRecipe(normalizeRowImage(res.data));
      if (token) {
        api.post(`/recipes/${id}/view`).catch(() => {});
      }
    } catch { /* ignore */ }
  }, [token]);

  const closeRecipe = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  // Called by RatingSection after a rating is submitted to keep card grid in sync
  const updateRecipeRating = useCallback((recipeId, avgRating, count) => {
    setRecipes(prev => prev.map(r =>
      r.id === recipeId ? { ...r, avg_rating: avgRating, rating_count: count } : r
    ));
  }, []);

  return { recipes, selectedRecipe, fetchRecipes, openRecipe, closeRecipe, updateRecipeRating };
}
