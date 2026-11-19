// src/context/NotificationContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../utils/axiosConfig';

const Ctx = createContext(null);

export function NotificationProvider({ children }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get('/notifications');
      const list = (Array.isArray(data) ? data : data?.items ?? []).map(n => ({
        ...n,
        read: n.isRead,       // Map backend `isRead` to frontend `read`
        link: n.actionUrl     // Map backend `actionUrl` to frontend `link`
      }));
      setItems(list);
    } catch {
      setError('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const markRead = useCallback(async (id) => {
    let snapshot;
    setItems((list) => {
      snapshot = list;
      return list.map((n) => (n.id === id ? { ...n, read: true } : n));
    });

    try {
      await api.patch(`/notifications/${id}/read`, { isRead: true });
    } catch (err) {
      if (snapshot) setItems(snapshot);
      throw err;
    }
  }, []);

  const markAllRead = useCallback(async () => {
    let snapshot;
    setItems((list) => {
      snapshot = list;
      return list.map((n) => ({ ...n, read: true }));
    });

    try {
      await api.post('/notifications/mark-all-read', { markAll: true });
    } catch (err) {
      if (snapshot) setItems(snapshot);
      throw err;
    }
  }, []);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const value = useMemo(
    () => ({ items, loading, error, unreadCount, refresh, markRead, markAllRead }),
    [items, loading, error, unreadCount, refresh, markRead, markAllRead]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used within <NotificationProvider>');
  return ctx;
}