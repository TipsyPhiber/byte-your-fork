import React, { useState } from 'react';
import RecipeGrid from '../components/RecipeGrid';

export default function Explore({ recipes, favoritedIds, onOpen, onToggleFavorite }) {
  const [activeTag, setActiveTag] = useState('All');

  const allTags = ['All', ...Array.from(new Set(recipes.map(r => r.tag).filter(Boolean))).sort()];
  const filteredRecipes = activeTag === 'All' ? recipes : recipes.filter(r => r.tag === activeTag);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--dark-blue)' }}>Explore All Recipes</h2>
      </div>
      <div className="tag-filter">
        {allTags.map(tag => (
          <button key={tag} className={`tag-pill ${activeTag === tag ? 'active' : ''}`} onClick={() => setActiveTag(tag)}>{tag}</button>
        ))}
      </div>
      <RecipeGrid list={filteredRecipes} favoritedIds={favoritedIds} onOpen={onOpen} onToggleFavorite={onToggleFavorite} />
    </div>
  );
}
