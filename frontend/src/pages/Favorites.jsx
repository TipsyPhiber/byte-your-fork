import React, { useState, useMemo } from 'react';
import RecipeGrid from '../components/RecipeGrid';
import { Heart } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'az',     label: 'A → Z' },
  { value: 'za',     label: 'Z → A' },
  { value: 'time',   label: 'Quickest' },
];

export default function Favorites({ favoriteRecipes, favoritedIds, onOpen, onToggleFavorite, token }) {
  const [sortBy, setSortBy] = useState('rating');
  const [filterTag, setFilterTag] = useState('all');

  const tags = useMemo(() => {
    const seen = new Set();
    favoriteRecipes.forEach(r => { if (r.tag) seen.add(r.tag); });
    return Array.from(seen).sort();
  }, [favoriteRecipes]);

  const visible = useMemo(() => {
    let list = filterTag === 'all'
      ? [...favoriteRecipes]
      : favoriteRecipes.filter(r => r.tag === filterTag);
    switch (sortBy) {
      case 'az':   return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'za':   return list.sort((a, b) => b.title.localeCompare(a.title));
      case 'time': return list.sort((a, b) => (a.ttc || 999) - (b.ttc || 999));
      default:     return list.sort((a, b) => (parseFloat(b.avg_rating) || 0) - (parseFloat(a.avg_rating) || 0));
    }
  }, [favoriteRecipes, sortBy, filterTag]);

  return (
    <div>
      {/* Header row — title + sort */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: tags.length > 1 ? '14px' : '24px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--dark-blue)' }}>Favorites</h2>
          {favoriteRecipes.length > 0 && (
            <p style={{ margin: '4px 0 0', color: 'var(--text-light)', fontSize: '0.875rem' }}>
              {visible.length}{visible.length !== favoriteRecipes.length ? ` of ${favoriteRecipes.length}` : ''} {favoriteRecipes.length === 1 ? 'recipe' : 'recipes'}
            </p>
          )}
        </div>
        {favoriteRecipes.length > 1 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`tag-pill ${sortBy === opt.value ? 'active' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cuisine tag filter */}
      {tags.length > 1 && (
        <div className="tag-filter" style={{ marginBottom: '24px' }}>
          <button
            onClick={() => setFilterTag('all')}
            className={`tag-pill ${filterTag === 'all' ? 'active' : ''}`}
          >
            All
          </button>
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag === filterTag ? 'all' : tag)}
              className={`tag-pill ${filterTag === tag ? 'active' : ''}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {favoriteRecipes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-light)' }}>
          <Heart size={48} style={{ marginBottom: '16px', opacity: 0.2, color: 'var(--text-2)' }} />
          <p style={{ margin: 0, fontSize: '1rem' }}>No favorites yet — save a recipe to see it here.</p>
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-light)' }}>
          <p style={{ margin: 0 }}>No favorites in this category yet.</p>
        </div>
      ) : (
        <RecipeGrid list={visible} favoritedIds={favoritedIds} onOpen={onOpen} onToggleFavorite={onToggleFavorite} token={token} />
      )}
    </div>
  );
}
