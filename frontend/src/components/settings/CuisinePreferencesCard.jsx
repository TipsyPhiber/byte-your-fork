import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../../config';

const TAG_GROUPS = [
  {
    label: 'Cuisines',
    tags: [
      'American', 'Asian', 'British', 'Cajun', 'Chinese', 'French', 'Greek',
      'Indian', 'Italian', 'Japanese', 'Korean', 'Mediterranean', 'Mexican',
      'Middle Eastern', 'Southwest', 'Spanish', 'Thai', 'Turkish', 'Vietnamese',
    ],
  },
  {
    label: 'Meal types',
    tags: ['Breakfast', 'Pasta', 'Salad', 'Soup', 'Slow Cooker', 'Dessert'],
  },
  {
    label: 'Dietary',
    tags: ['Vegan', 'Vegetarian'],
  },
  {
    label: 'Protein',
    tags: ['Beef', 'Chicken'],
  },
];

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
      <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Recipe Preferences</h3>
      <p style={{ margin: '0 0 16px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
        Your dashboard will default to showing recipes tagged with these first.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
        {TAG_GROUPS.map(group => (
          <div key={group.label}>
            <div style={{
              fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--text-3)', fontWeight: 700, marginBottom: '8px',
            }}>
              {group.label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {group.tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggle(tag)}
                  className={`tag-pill ${preferences.includes(tag) ? 'active' : ''}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
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
