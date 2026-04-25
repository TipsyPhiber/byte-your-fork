import React, { useState, useMemo } from 'react';
import RecipeGrid from '../components/RecipeGrid';
import SearchBar from '../components/SearchBar';
import { recipeMatchesRestrictions, DIETARY_LABELS } from '../utils/dietaryFilter';

export default function Explore({ recipes, favoritedIds, onOpen, onToggleFavorite, token, user }) {
  const [activeTag, setActiveTag] = useState('All');
  const [activeDiets, setActiveDiets] = useState([]);

  const userRestrictions = user?.dietary_restrictions || [];

  const allTags = useMemo(
    () => ['All', ...Array.from(new Set(recipes.map(r => r.tag).filter(Boolean))).sort()],
    [recipes]
  );

  const filteredRecipes = useMemo(() => {
    const allRestrictions = Array.from(new Set([...userRestrictions, ...activeDiets]));
    return recipes.filter(r => {
      if (activeTag !== 'All' && r.tag !== activeTag) return false;
      if (!recipeMatchesRestrictions(r, allRestrictions)) return false;
      return true;
    });
  }, [recipes, activeTag, activeDiets, userRestrictions]);

  const toggleDiet = (flag) => {
    setActiveDiets(prev => prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]);
  };

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

      <div className="tag-filter" style={{ marginTop: 8 }}>
        {Object.entries(DIETARY_LABELS).map(([flag, label]) => {
          const locked = userRestrictions.includes(flag);
          const active = locked || activeDiets.includes(flag);
          return (
            <button
              key={flag}
              onClick={() => !locked && toggleDiet(flag)}
              className={`tag-pill ${active ? 'active' : ''}`}
              title={locked ? 'From your dietary restrictions' : undefined}
              style={{ opacity: locked ? 0.75 : 1, cursor: locked ? 'default' : 'pointer' }}
            >
              {label}{locked ? ' 🔒' : ''}
            </button>
          );
        })}
      </div>

      {filteredRecipes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-light)' }}>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>No recipes in this category yet.</p>
        </div>
      ) : (
        <RecipeGrid list={filteredRecipes} favoritedIds={favoritedIds} onOpen={onOpen} onToggleFavorite={onToggleFavorite} token={token} />
      )}
    </div>
  );
}
