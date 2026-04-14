import { useState, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

const BASE = `${API_BASE}/api`;

export function useFavorites(token) {
  const [favoritedIds, setFavoritedIds] = useState(new Set());
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);

  const fetchFavorites = useCallback(async () => {
    if (!token) return;
    try {
      const [idsRes, recipesRes] = await Promise.all([
        axios.get(`${BASE}/favorites/ids`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE}/favorites`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setFavoritedIds(new Set(idsRes.data));
      setFavoriteRecipes(recipesRes.data);
    } catch { /* ignore */ }
  }, [token]);

  // recipes param: the full recipe list, used to look up a newly favorited recipe's data
  const toggleFavorite = useCallback(async (e, recipeId, recipes) => {
    e.stopPropagation();
    const isFav = favoritedIds.has(recipeId);
    try {
      if (isFav) {
        await axios.delete(`${BASE}/favorites/${recipeId}`, { headers: { Authorization: `Bearer ${token}` } });
        setFavoritedIds(prev => { const s = new Set(prev); s.delete(recipeId); return s; });
        setFavoriteRecipes(prev => prev.filter(r => r.id !== recipeId));
      } else {
        await axios.post(`${BASE}/favorites/${recipeId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setFavoritedIds(prev => new Set([...prev, recipeId]));
        const recipe = recipes?.find(r => r.id === recipeId);
        if (recipe) setFavoriteRecipes(prev => [...prev, recipe].sort((a, b) => a.title.localeCompare(b.title)));
      }
    } catch { /* ignore */ }
  }, [token, favoritedIds]);

  return { favoritedIds, favoriteRecipes, fetchFavorites, toggleFavorite };
}
