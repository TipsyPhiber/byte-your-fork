import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../../config';

const EmailCard = ({ user, setUser, token }) => {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      await axios.put(`${API_BASE}/api/auth/update-email`, { newEmail, password }, { headers: { Authorization: `Bearer ${token}` } });
      setUser({ ...user, email: newEmail });
      setMessage('Email updated successfully!');
      setNewEmail(''); setPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update email.');
    }
  };

  return (
    <div className="settings-card">
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Change Email</h3>
      {message && <p style={{ color: '#059669', background: '#ecfdf5', padding: '10px', borderRadius: '6px' }}>{message}</p>}
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="email" className="search-bar" style={{ paddingLeft: '15px' }} placeholder="New email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
        <input type="password" className="search-bar" style={{ paddingLeft: '15px' }} placeholder="Confirm current password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" className="primary-button">Update Email</button>
      </form>
    </div>
  );
};

export default EmailCard;
