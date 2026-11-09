import { useState, useCallback } from 'react';
import { api } from '../api';
import { normalizeRowImage } from '../config';

export function useNotifications(token) {
  const [notifications, setNotifications] = useState([]);
  const [clearedAt, setClearedAt] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.map(normalizeRowImage));
    } catch { /* ignore */ }
  }, [token]);

  const handleClearNotifications = useCallback(async () => {
    try {
      const res = await api.put('/auth/clear-notifications');
      setClearedAt(res.data.cleared_at);
    } catch { /* ignore */ }
  }, []);

  const handleDismissNotification = useCallback(async (e, recipeId) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${recipeId}`);
      setNotifications(prev => prev.filter(n => n.id !== recipeId));
    } catch { /* ignore */ }
  }, []);

  const visibleNotifs = clearedAt
    ? notifications.filter(n => new Date(n.creation_date) > new Date(clearedAt))
    : notifications;

  return { visibleNotifs, clearedAt, setClearedAt, fetchNotifications, handleClearNotifications, handleDismissNotification };
}
