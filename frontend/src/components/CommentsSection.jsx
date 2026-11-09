import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { X } from 'lucide-react';

export default function CommentsSection({ recipeId, token, user, isAdmin }) { // eslint-disable-line no-unused-vars -- token still flows; auth lives in the shared api client
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (!recipeId) return;
    api.get(`/comments/${recipeId}`)
      .then(res => setComments(res.data))
      .catch(() => {});
  }, [recipeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/comments/${recipeId}`, { text: newComment });
      setComments(prev => [res.data, ...prev]);
      setNewComment('');
    } catch { /* ignore */ }
  };

  const handleDelete = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {comments.length === 0 && (
          <p style={{ color: 'var(--text-2)', margin: 0, fontSize: '0.9rem' }}>No comments yet — be the first!</p>
        )}
        {comments.map(c => (
          <div key={c.id} style={{
            background: 'var(--page-bg)', borderRadius: '10px',
            padding: '12px 16px', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '0.875rem' }}>{c.username || c.first_name}</span>
                <span style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginLeft: '10px' }}>
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
              {(user?.id === c.user_id || isAdmin) && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="icon-btn danger"
                  style={{ margin: '-12px -12px -12px 0' }}
                  title="Delete comment"
                  aria-label="Delete comment"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <p style={{ margin: '6px 0 0', color: 'var(--text-1)', fontSize: '0.9rem', lineHeight: 1.5 }}>{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
