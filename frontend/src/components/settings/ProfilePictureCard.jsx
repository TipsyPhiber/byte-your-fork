import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../../config';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;

const ProfilePictureCard = ({ user, setUser, token }) => {
  const [preview, setPreview] = useState(user?.avatar_url || null);
  const [message, setMessage] = useState('');

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMessage('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage('Invalid file type. Only JPEG, PNG, WebP, or GIF allowed.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setMessage(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    setPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/avatar`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setUser({ ...user, avatar_url: res.data.avatar_url });
      setMessage('Profile picture updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to upload.');
    }
  };

  return (
    <div className="settings-card">
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Profile Picture</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--accent)', flexShrink: 0 }}>
          {preview
            ? <img src={preview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.5rem' }}>
                {user?.first_name?.[0]?.toUpperCase() || '?'}
              </div>
          }
        </div>
        <div>
          <label className="primary-button" style={{ cursor: 'pointer', display: 'inline-block' }}>
            Choose Photo
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleChange} style={{ display: 'none' }} />
          </label>
          <p style={{ margin: '6px 0 0', color: 'var(--text-light)', fontSize: '0.8rem' }}>JPEG, PNG, WebP, or GIF · Max 5 MB</p>
          {message && (
            <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: message.includes('updated') ? '#059669' : '#dc2626' }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureCard;
