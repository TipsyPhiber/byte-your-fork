import { useState, useCallback } from 'react';
import { api } from '../api';
import { normalizeRowImage } from '../config';

export function useFavorites(token) {
  const [favoritedIds, setFavoritedIds] = useState(new Set());
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);

  const fetchFavorites = useCallback(async () => {
    if (!token) return;
    try {
      const [idsRes, recipesRes] = await Promise.all([
        api.get('/favorites/ids'),
        api.get('/favorites'),
      ]);
      setFavoritedIds(new Set(idsRes.data));
      setFavoriteRecipes(recipesRes.data.map(normalizeRowImage));
    } catch { /* ignore */ }
  }, [token]);

  // recipes param: the full recipe list, used to look up a newly favorited recipe's data
  const toggleFavorite = useCallback(async (e, recipeId, recipes) => {
    e.stopPropagation();
    const isFav = favoritedIds.has(recipeId);
    try {
      if (isFav) {
        await api.delete(`/favorites/${recipeId}`);
        setFavoritedIds(prev => { const s = new Set(prev); s.delete(recipeId); return s; });
        setFavoriteRecipes(prev => prev.filter(r => r.id !== recipeId));
      } else {
        await api.post(`/favorites/${recipeId}`);
        setFavoritedIds(prev => new Set([...prev, recipeId]));
        const recipe = recipes?.find(r => r.id === recipeId);
        if (recipe) setFavoriteRecipes(prev => [...prev, recipe].sort((a, b) => a.title.localeCompare(b.title)));
      }
    } catch { /* ignore */ }
  }, [favoritedIds]);

  return { favoritedIds, favoriteRecipes, fetchFavorites, toggleFavorite };
}
