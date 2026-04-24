import React from 'react';

const AppearanceCard = ({ darkMode, setDarkMode }) => (
  <div className="settings-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '4px' }}>Appearance</h3>
      <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.9rem' }}>Switch between light and dark theme</p>
    </div>
    <label className="dark-toggle">
      <input type="checkbox" checked={!!darkMode} onChange={e => setDarkMode(e.target.checked)} />
      <span className="dark-toggle-track" />
    </label>
  </div>
);

export default AppearanceCard;
