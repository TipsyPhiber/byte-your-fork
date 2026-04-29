import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../../config';

const RESTRICTIONS = [
  { flag: 'dairy_free',     label: 'Lactose / Dairy-free', desc: 'Hide recipes with milk, butter, cheese, cream, yogurt' },
  { flag: 'gluten_free',    label: 'Gluten-free',          desc: 'Hide recipes with wheat, pasta, bread, barley' },
  { flag: 'nut_free',       label: 'Nut-free',             desc: 'Hide recipes with peanuts or tree nuts' },
  { flag: 'egg_free',       label: 'Egg-free',             desc: 'Hide recipes containing eggs' },
  { flag: 'shellfish_free', label: 'Shellfish-free',       desc: 'Hide recipes with shrimp, crab, lobster, mussels' },
  { flag: 'vegetarian',     label: 'Vegetarian',           desc: 'Hide recipes with meat or seafood' },
  { flag: 'vegan',          label: 'Vegan',                desc: 'Hide recipes with any animal products' },
];

export default function DietaryRestrictionsCard({ user, setUser, token }) {
  const userRestrictions = user?.dietary_restrictions;
  const [selected, setSelected] = useState(userRestrictions || []);
  const [lastSyncedRestrictions, setLastSyncedRestrictions] = useState(userRestrictions);
  const [message, setMessage] = useState('');

  if (userRestrictions !== lastSyncedRestrictions) {
    setLastSyncedRestrictions(userRestrictions);
    setSelected(userRestrictions || []);
  }

  const toggle = (flag) => {
    setSelected(prev => prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]);
  };

  const handleSave = async () => {
    try {
      const res = await axios.put(
        `${API_BASE}/api/auth/dietary-restrictions`,
        { restrictions: selected },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser({ ...user, dietary_restrictions: res.data.restrictions });
      setMessage('Saved.');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('Failed to save.');
    }
  };

  return (
    <div className="settings-card">
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>Dietary Restrictions</h3>
      <p style={{ margin: '0 0 16px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
        Recipes with ingredients you can't eat will be hidden. Based on ingredient scanning — always double-check for serious allergies.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {RESTRICTIONS.map(r => {
          const active = selected.includes(r.flag);
          return (
            <label
              key={r.flag}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                borderRadius: 10, border: `1px solid ${active ? 'var(--accent, #3b82f6)' : 'var(--border)'}`,
                background: active ? 'rgba(59,130,246,0.08)' : 'var(--surface)',
                cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(r.flag)}
                style={{ marginTop: 3, cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-1)' }}>{r.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>{r.desc}</div>
              </div>
            </label>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="primary-button" onClick={handleSave}>Save</button>
        {message && <span style={{ color: '#059669', fontSize: '0.9rem' }}>{message}</span>}
      </div>
    </div>
  );
}
