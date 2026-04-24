import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../../config';

const UsernameCard = ({ user, setUser, token }) => {
  const [username, setUsername] = useState(user?.username || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
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

  return (
    <div className="settings-card">
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Update Username</h3>
      {message && <p style={{ color: '#059669', backgroundColor: '#ecfdf5', padding: '10px', borderRadius: '6px' }}>{message}</p>}
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
  );
};

export default UsernameCard;
