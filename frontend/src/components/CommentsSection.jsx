import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

const BASE = `${API_BASE}/api`;

export default function CommentsSection({ recipeId, token, user, isAdmin }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (!recipeId) return;
    axios.get(`${BASE}/comments/${recipeId}`)
      .then(res => setComments(res.data))
      .catch(() => {});
  }, [recipeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await axios.post(`${BASE}/comments/${recipeId}`, { text: newComment }, { headers: { Authorization: `Bearer ${token}` } });
      setComments(prev => [res.data, ...prev]);
      setNewComment('');
    } catch { /* ignore */ }
  };

  const handleDelete = async (commentId) => {
    try {
      await axios.delete(`${BASE}/comments/${commentId}`, { headers: { Authorization: `Bearer ${token}` } });
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { /* ignore */ }
  };

  return (
    <div style={{ marginTop: '32px' }}>
      <h3 className="recipe-section-title">Comments ({comments.length})</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          className="edit-input"
          style={{ flex: 1 }}
          placeholder="Leave a comment..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          maxLength={255}
        />
        <button type="submit" className="primary-button" style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>Post</button>
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {comments.length === 0 && <p style={{ color: 'var(--text-light)', margin: 0 }}>No comments yet — be the first!</p>}
        {comments.map(c => (
          <div key={c.id} style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px 16px', border: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontWeight: 700, color: 'var(--dark-blue)', fontSize: '0.9rem' }}>{c.username || c.first_name}</span>
                <span style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginLeft: '10px' }}>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              {(user?.id === c.user_id || isAdmin) && (
                <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.8rem' }}>✕</button>
              )}
            </div>
            <p style={{ margin: '6px 0 0', color: '#374151', fontSize: '0.95rem' }}>{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
