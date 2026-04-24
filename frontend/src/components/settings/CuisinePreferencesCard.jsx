import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../../config';

const ALL_CUISINES = ['Italian', 'Asian', 'Mediterranean', 'Indian', 'Southwest', 'Mexican', 'American', 'Thai', 'Middle Eastern', 'Cajun'];

const CuisinePreferencesCard = ({ user, setUser, token, onPreferencesChange }) => {
  const [preferences, setPreferences] = useState(user?.preferences || []);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setPreferences(user?.preferences || []);
  }, [user?.preferences]);

  const toggle = (tag) => {
    setPreferences(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    try {
      await axios.put(`${API_BASE}/api/auth/preferences`, { preferences }, { headers: { Authorization: `Bearer ${token}` } });
      setUser({ ...user, preferences });
      if (onPreferencesChange) onPreferencesChange(preferences);
      setMessage('Preferences saved!');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('Failed to save.');
    }
  };

  return (
    <div className="settings-card">
      <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Cuisine Preferences</h3>
      <p style={{ margin: '0 0 16px', color: 'var(--text-light)', fontSize: '0.9rem' }}>Your dashboard will default to showing these cuisines first.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {ALL_CUISINES.map(tag => (
          <button
            key={tag}
            onClick={() => toggle(tag)}
            className={`tag-pill ${preferences.includes(tag) ? 'active' : ''}`}
          >
            {tag}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="primary-button" onClick={handleSave}>Save Preferences</button>
        {message && <span style={{ color: '#059669', fontSize: '0.9rem' }}>{message}</span>}
      </div>
    </div>
  );
};

export default CuisinePreferencesCard;
