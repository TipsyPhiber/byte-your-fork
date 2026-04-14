import React from 'react';
import RecipeGrid from '../components/RecipeGrid';

export default function Favorites({ favoriteRecipes, favoritedIds, onOpen, onToggleFavorite }) {
  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: 'var(--dark-blue)' }}>Your Favorites</h2>
      {favoriteRecipes.length === 0
        ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-light)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🍴</div>
            <p>No favorites yet — heart a recipe to save it here.</p>
          </div>
        )
        : <RecipeGrid list={favoriteRecipes} favoritedIds={favoritedIds} onOpen={onOpen} onToggleFavorite={onToggleFavorite} />
      }
    </div>
  );
}
