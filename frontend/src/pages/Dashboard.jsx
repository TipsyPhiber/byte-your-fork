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
      <div className="screen-header">
        <h2 className="screen-title">
          {user?.first_name ? `Hi ${user.first_name} 👋` : 'Welcome'}
        </h2>
        <p className="screen-subtitle">
          {user?.preferences?.length > 0
            ? `Picked for your ${user.preferences.join(', ')} taste, sorted by rating`
            : 'The highest rated recipes across all cuisines'}
        </p>
      </div>
      <RecipeGrid list={featuredRecipes} favoritedIds={favoritedIds} onOpen={onOpen} onToggleFavorite={onToggleFavorite} token={token} />
    </div>
  );
}
