import React, { useMemo } from 'react';
import RecipeGrid from '../components/RecipeGrid';
import { recipeMatchesRestrictions } from '../utils/dietaryFilter';

export default function Dashboard({ recipes, user, favoritedIds, onOpen, onToggleFavorite, token }) {
  const featuredRecipes = useMemo(() => {
    const restrictions = user?.dietary_restrictions || [];
    const safeRecipes = recipes.filter(r => recipeMatchesRestrictions(r, restrictions));
    const prefs = user?.preferences || [];
    let pool = prefs.length > 0 ? safeRecipes.filter(r => prefs.includes(r.tag)) : safeRecipes;
    if (pool.length === 0) pool = safeRecipes;
    return [...pool]
      .sort((a, b) => (parseFloat(b.avg_rating) || 0) - (parseFloat(a.avg_rating) || 0))
      .slice(0, 24);
  }, [recipes, user?.preferences, user?.dietary_restrictions]);

  return (
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
      <RecipeGrid list={featuredRecipes} favoritedIds={favoritedIds} onOpen={onOpen} onToggleFavorite={onToggleFavorite} token={token} />
    </div>
  );
}
