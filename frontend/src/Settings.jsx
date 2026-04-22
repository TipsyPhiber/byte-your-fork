import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from './config';

const ALL_CUISINES = ['Italian', 'Asian', 'Mediterranean', 'Indian', 'Southwest', 'Mexican', 'American', 'Thai', 'Middle Eastern', 'Cajun'];

const Settings = ({ user, setUser, token, onPreferencesChange, darkMode, setDarkMode }) => {
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [preferences, setPreferences] = useState(user?.preferences || []);
  const [prefMessage, setPrefMessage] = useState('');
  const [avatarMessage, setAvatarMessage] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminMessage, setAdminMessage] = useState('');

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
      await axios.put(`${API_BASE}/api/auth/preferences`, { preferences }, { headers: { Authorization: `Bearer ${token}` } });
      setUser({ ...user, preferences });
      if (onPreferencesChange) onPreferencesChange(preferences);
      setPrefMessage('Preferences saved!');
      setTimeout(() => setPrefMessage(''), 2000);
    } catch {
      setPrefMessage('Failed to save.');
    }
  };

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_SIZE_MB = 5;

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarMessage('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarMessage('Invalid file type. Only JPEG, PNG, WebP, or GIF allowed.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setAvatarMessage(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/avatar`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setUser({ ...user, avatar_url: res.data.avatar_url });
      setAvatarMessage('Profile picture updated!');
      setTimeout(() => setAvatarMessage(''), 3000);
    } catch (err) {
      setAvatarMessage(err.response?.data?.error || 'Failed to upload.');
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setEmailMessage(''); setEmailError('');
    try {
      await axios.put(`${API_BASE}/api/auth/update-email`, { newEmail, password: emailPassword }, { headers: { Authorization: `Bearer ${token}` } });
      setUser({ ...user, email: newEmail });
      setEmailMessage('Email updated successfully!');
      setNewEmail(''); setEmailPassword('');
    } catch (err) {
      setEmailError(err.response?.data?.error || 'Failed to update email.');
    }
  };

  const handleSetAdmin = async (makeAdmin) => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/admin/set-role`, { username: adminUsername, makeAdmin }, { headers: { Authorization: `Bearer ${token}` } });
      setAdminMessage(res.data.message);
      setAdminUsername('');
    } catch (err) {
      setAdminMessage(err.response?.data?.error || 'Failed.');
    }
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE}/api/auth/update-username`,
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
      const response = await axios.put(`${API_BASE}/api/auth/update-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Password updated successfully!');
      setError('');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data || 'Failed to update password.';
      const finalMsg = typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg);
      setError(finalMsg);
      setMessage('');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ color: 'var(--dark-blue)', marginBottom: '30px' }}>Account Settings</h2>

      {/* Appearance */}
      <div className="settings-card" style={{ padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: '4px' }}>Appearance</h3>
          <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.9rem' }}>Switch between light and dark theme</p>
        </div>
        <label className="dark-toggle">
          <input type="checkbox" checked={!!darkMode} onChange={e => setDarkMode(e.target.checked)} />
          <span className="dark-toggle-track" />
        </label>
      </div>

      {/* Profile Picture */}
      <div className="settings-card" style={{ padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Profile Picture</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--accent)', flexShrink: 0 }}>
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.5rem' }}>
                  {user?.first_name?.[0]?.toUpperCase() || '?'}
                </div>
            }
          </div>
          <div>
            <label className="primary-button" style={{ cursor: 'pointer', display: 'inline-block' }}>
              Choose Photo
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </label>
            <p style={{ margin: '6px 0 0', color: 'var(--text-light)', fontSize: '0.8rem' }}>JPEG, PNG, WebP, or GIF · Max 5 MB</p>
            {avatarMessage && (
              <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: avatarMessage.includes('updated') ? '#059669' : '#dc2626' }}>
                {avatarMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {message && <p style={{ color: '#059669', backgroundColor: '#ecfdf5', padding: '10px', borderRadius: '6px' }}>{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="settings-card" style={{ padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Update Username</h3>
        <form onSubmit={handleUpdateUsername} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="text" 
            className="search-bar" 
            style={{ paddingLeft: '15px' }}
            placeholder="New Username (max 15 characters)"
            maxLength={15}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button type="submit" className="primary-button">Save Username</button>
        </form>
      </div>

      <div className="settings-card" style={{ padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
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

      <div className="settings-card" style={{ padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Change Email</h3>
        {emailMessage && <p style={{ color: '#059669', background: '#ecfdf5', padding: '10px', borderRadius: '6px' }}>{emailMessage}</p>}
        {emailError && <p className="error-message">{emailError}</p>}
        <form onSubmit={handleUpdateEmail} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="email" className="search-bar" style={{ paddingLeft: '15px' }} placeholder="New email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
          <input type="password" className="search-bar" style={{ paddingLeft: '15px' }} placeholder="Confirm current password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)} required />
          <button type="submit" className="primary-button">Update Email</button>
        </form>
      </div>

      <div className="settings-card" style={{ padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
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
            placeholder="New Password (max 15 characters)"
            maxLength={15}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button type="submit" className="primary-button">Update Password</button>
        </form>
      </div>
      {user?.role === 'admin' && (
        <div style={{ backgroundColor: '#fff7ed', padding: '30px', borderRadius: '15px', border: '1px solid #fed7aa', marginTop: '30px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '6px', color: '#c2410c' }}>Admin Panel</h3>
          <p style={{ margin: '0 0 16px', color: '#9a3412', fontSize: '0.9rem' }}>Grant or revoke admin access by username.</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input className="search-bar" style={{ paddingLeft: '15px', flex: 1, minWidth: '180px' }} placeholder="Username" value={adminUsername} onChange={e => setAdminUsername(e.target.value)} />
            <button className="primary-button" style={{ background: '#16a34a' }} onClick={() => handleSetAdmin(true)}>Make Admin</button>
            <button className="primary-button" style={{ background: '#dc2626' }} onClick={() => handleSetAdmin(false)}>Remove Admin</button>
          </div>
          {adminMessage && <p style={{ margin: '12px 0 0', fontSize: '0.9rem', color: '#374151' }}>{adminMessage}</p>}
        </div>
      )}
    </div>
  );
};

export default Settings;
