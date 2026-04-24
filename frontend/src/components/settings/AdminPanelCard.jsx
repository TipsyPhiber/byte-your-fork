import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../../config';

const AdminPanelCard = ({ token }) => {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');

  const handleSetAdmin = async (makeAdmin) => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/admin/set-role`, { username, makeAdmin }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage(res.data.message);
      setUsername('');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed.');
    }
  };

  return (
    <div style={{ backgroundColor: '#fff7ed', padding: '30px', borderRadius: '15px', border: '1px solid #fed7aa', marginTop: '30px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '6px', color: '#c2410c' }}>Admin Panel</h3>
      <p style={{ margin: '0 0 16px', color: '#9a3412', fontSize: '0.9rem' }}>Grant or revoke admin access by username.</p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input className="search-bar" style={{ paddingLeft: '15px', flex: 1, minWidth: '180px' }} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <button className="primary-button" style={{ background: '#16a34a' }} onClick={() => handleSetAdmin(true)}>Make Admin</button>
        <button className="primary-button" style={{ background: '#dc2626' }} onClick={() => handleSetAdmin(false)}>Remove Admin</button>
      </div>
      {message && <p style={{ margin: '12px 0 0', fontSize: '0.9rem', color: '#374151' }}>{message}</p>}
    </div>
  );
};

export default AdminPanelCard;
