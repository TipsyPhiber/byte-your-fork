import { useState, useCallback } from 'react';
import axios from 'axios';
import { API_BASE, normalizeRowImage } from '../config';

const BASE = `${API_BASE}/api`;

export function useNotifications(token) {
  const [notifications, setNotifications] = useState([]);
  const [clearedAt, setClearedAt] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${BASE}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(res.data.map(normalizeRowImage));
    } catch { /* ignore */ }
  }, [token]);

  const handleClearNotifications = useCallback(async () => {
    try {
      const res = await axios.put(`${BASE}/auth/clear-notifications`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setClearedAt(res.data.cleared_at);
    } catch { /* ignore */ }
  }, [token]);

  const handleDismissNotification = useCallback(async (e, recipeId) => {
    e.stopPropagation();
    try {
      await axios.delete(`${BASE}/notifications/${recipeId}`, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.filter(n => n.id !== recipeId));
    } catch { /* ignore */ }
  }, [token]);

  const visibleNotifs = clearedAt
    ? notifications.filter(n => new Date(n.creation_date) > new Date(clearedAt))
    : notifications;

  return { visibleNotifs, clearedAt, setClearedAt, fetchNotifications, handleClearNotifications, handleDismissNotification };
}
