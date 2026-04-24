import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../../config';

const PasswordCard = ({ token }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE}/api/auth/update-password`,
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
    <div className="settings-card">
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Change Password</h3>
      {message && <p style={{ color: '#059669', backgroundColor: '#ecfdf5', padding: '10px', borderRadius: '6px' }}>{message}</p>}
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
  );
};

export default PasswordCard;
