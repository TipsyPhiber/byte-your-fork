import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE, normalizeRowImage } from '../config';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1495195129352-aec325a55b65?auto=format&fit=crop&w=600&q=80';

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const queryReady = query.trim().length >= 2;

  useEffect(() => {
    if (!queryReady) return;
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/search?query=${encodeURIComponent(query.trim())}`);
        setSuggestions(res.data.map(normalizeRowImage));
        setShowSuggestions(true);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, queryReady]);

  return (
    <div className="search-container">
      <input
        type="text"
        className="search-bar"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { if (query.trim().length >= 2 && suggestions.length > 0) setShowSuggestions(true); }}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder="Search recipes..."
      />
      {queryReady && showSuggestions && suggestions.length > 0 && (
        <div className="search-suggestions">
          {suggestions.map(s => (
            <div key={s.id} className="suggestion-item" onClick={() => { onSelect(s.id); setQuery(''); setShowSuggestions(false); }}>
              <img src={s.image_url || FALLBACK_IMG} onError={e => e.target.src = FALLBACK_IMG} alt="" />
              <span>{s.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
