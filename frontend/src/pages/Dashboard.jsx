import React, { useMemo } from 'react';
import RecipeGrid from '../components/RecipeGrid';

export default function Dashboard({ recipes, user, favoritedIds, onOpen, onToggleFavorite }) {
  const featuredRecipes = useMemo(() => {
    const prefs = user?.preferences || [];
    let pool = prefs.length > 0 ? recipes.filter(r => prefs.includes(r.tag)) : recipes;
    if (pool.length === 0) pool = recipes;
    return [...pool]
      .sort((a, b) => (parseFloat(b.avg_rating) || 0) - (parseFloat(a.avg_rating) || 0))
      .slice(0, 24);
  }, [recipes, user?.preferences]);

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
      <RecipeGrid list={featuredRecipes} favoritedIds={favoritedIds} onOpen={onOpen} onToggleFavorite={onToggleFavorite} />
    </div>
  );
}
