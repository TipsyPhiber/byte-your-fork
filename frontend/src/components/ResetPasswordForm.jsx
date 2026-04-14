import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

export default function ResetPasswordForm({ token, onDone }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) return setError("Passwords don't match.");
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/api/auth/reset-password`, { token, newPassword });
      setStatus(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
      <div className="auth-card" style={{ boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <h2>Set New Password</h2>
        {status ? (
          <>
            <p style={{ textAlign: 'center', color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', fontSize: '0.9rem' }}>{status}</p>
            <p className="toggle-text" style={{ marginTop: '16px' }}>
              <span onClick={onDone} className="toggle-link" style={{ color: '#6366f1' }}>Go to Login →</span>
            </p>
          </>
        ) : (
          <>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleSubmit} className="auth-form">
              <input type="password" placeholder="New password (max 15 characters)" maxLength={15} value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              <input type="password" placeholder="Confirm password" maxLength={15} value={confirm} onChange={e => setConfirm(e.target.value)} required />
              <button type="submit" className="primary-button" style={{ backgroundColor: '#6366f1' }} disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
