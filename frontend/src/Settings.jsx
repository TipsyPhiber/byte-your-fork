import React, { useState } from 'react';
import axios from 'axios';

const Settings = ({ user, setUser, token }) => {
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
      await axios.put('http://localhost:5000/api/auth/update-password', 
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Password updated successfully!');
      setMessage('Password updated successfully!');
      setError('');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to update password.';
      setError(errMsg);
      alert('Error: ' + errMsg);
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
