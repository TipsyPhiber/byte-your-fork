import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ALL_CUISINES = ['Italian', 'Asian', 'Mediterranean', 'Indian', 'Southwest', 'Mexican', 'American', 'Thai', 'Middle Eastern', 'Cajun'];

const Settings = ({ user, setUser, token, onPreferencesChange }) => {
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [preferences, setPreferences] = useState(user?.preferences || []);
  const [prefMessage, setPrefMessage] = useState('');

  useEffect(() => {
    setPreferences(user?.preferences || []);
  }, [user?.preferences]);

  const togglePreference = (tag) => {
    setPreferences(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSavePreferences = async () => {
    try {
      await axios.put('http://localhost:5000/api/auth/preferences', { preferences }, { headers: { Authorization: `Bearer ${token}` } });
      setUser({ ...user, preferences });
      if (onPreferencesChange) onPreferencesChange(preferences);
      setPrefMessage('Preferences saved!');
      setTimeout(() => setPrefMessage(''), 2000);
    } catch {
      setPrefMessage('Failed to save.');
    }
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    try {
      await axios.put('http://localhost:5000/api/auth/update-username', 
        { username },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser({ ...user, username });
      setMessage('Username updated successfully!');
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update username.');
      setMessage('');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put('http://localhost:5000/api/auth/update-password', 
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message || 'Password updated successfully!');
      setMessage('Password updated successfully!');
      setError('');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      console.error('Password Update Catch:', err);
      const errMsg = err.response?.data?.error || err.response?.data || 'Failed to update password.';
      const finalMsg = typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg);
      setError(finalMsg);
      alert('Error: ' + finalMsg);
      setMessage('');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ color: 'var(--dark-blue)', marginBottom: '30px' }}>Account Settings</h2>
      
      {message && <p style={{ color: '#059669', backgroundColor: '#ecfdf5', padding: '10px', borderRadius: '6px' }}>{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Update Username</h3>
        <form onSubmit={handleUpdateUsername} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="text" 
            className="search-bar" 
            style={{ paddingLeft: '15px' }}
            placeholder="New Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
          />
          <button type="submit" className="primary-button">Save Username</button>
        </form>
      </div>

      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Cuisine Preferences</h3>
        <p style={{ margin: '0 0 16px', color: 'var(--text-light)', fontSize: '0.9rem' }}>Your dashboard will default to showing these cuisines first.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {ALL_CUISINES.map(tag => (
            <button
              key={tag}
              onClick={() => togglePreference(tag)}
              className={`tag-pill ${preferences.includes(tag) ? 'active' : ''}`}
            >
              {tag}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="primary-button" onClick={handleSavePreferences}>Save Preferences</button>
          {prefMessage && <span style={{ color: '#059669', fontSize: '0.9rem' }}>{prefMessage}</span>}
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Change Password</h3>
        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="password" 
            className="search-bar" 
            style={{ paddingLeft: '15px' }}
            placeholder="Current Password" 
            value={currentPassword} 
            onChange={(e) => setCurrentPassword(e.target.value)} 
          />
          <input 
            type="password" 
            className="search-bar" 
            style={{ paddingLeft: '15px' }}
            placeholder="New Password" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
          />
          <button type="submit" className="primary-button">Update Password</button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
