import React, { useState, useMemo } from 'react';
import RecipeGrid from '../components/RecipeGrid';
import SearchBar from '../components/SearchBar';

export default function Explore({ recipes, favoritedIds, onOpen, onToggleFavorite }) {
  const [activeTag, setActiveTag] = useState('All');

  const allTags = useMemo(
    () => ['All', ...Array.from(new Set(recipes.map(r => r.tag).filter(Boolean))).sort()],
    [recipes]
  );

  const filteredRecipes = useMemo(
    () => activeTag === 'All' ? recipes : recipes.filter(r => r.tag === activeTag),
    [recipes, activeTag]
  );

  return (
    <div>
      {/* In-page search */}
      <div style={{ marginBottom: '24px', maxWidth: '480px' }}>
        <SearchBar onSelect={onOpen} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--dark-blue)' }}>Explore</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--text-light)', fontSize: '0.875rem' }}>
          {filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'}
          {activeTag !== 'All' ? ` in ${activeTag}` : ' across all cuisines'}
        </p>
      </div>

      <div className="tag-filter">
        {allTags.map(tag => (
          <button
            key={tag}
            className={`tag-pill ${activeTag === tag ? 'active' : ''}`}
            onClick={() => setActiveTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {filteredRecipes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-light)' }}>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>No recipes in this category yet.</p>
        </div>
      ) : (
        <RecipeGrid list={filteredRecipes} favoritedIds={favoritedIds} onOpen={onOpen} onToggleFavorite={onToggleFavorite} />
      )}
    </div>
  );
}
