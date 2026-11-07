import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth.js';
import { getStoredToken } from '../services/api.js';
import notificationService from '../services/notificationService.js';
import { NotificationContext } from './notificationContextInstance.js';

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    unread: 0,
    read: 0,
    critical: 0,
    byCategory: {
      weather: 0,
      crop: 0,
      soil: 0,
      irrigation: 0,
      disease: 0,
      system: 0,
    },
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [preferences, setPreferences] = useState({
    weatherAlerts: true,
    cropAlerts: true,
    soilAlerts: true,
    irrigationAlerts: true,
    diseaseAlerts: true,
    systemAlerts: true,
    criticalOnly: false,
  });

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [latestLiveAlert, setLatestLiveAlert] = useState(null);

  const socketRef = useRef(null);

  // 1. Fetch unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationService.getUnreadCount();
      if (res?.success && typeof res.data?.unreadCount === 'number') {
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // Ignore count fetch errors
    }
  }, [user]);

  // 2. Fetch full notifications list with filters
  const fetchNotifications = useCallback(async (params = {}) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await notificationService.getNotifications(params);
      if (res?.success && res.data) {
        setNotifications(res.data.notifications || []);
        if (res.data.summary) setSummary(res.data.summary);
        if (res.data.pagination) setPagination(res.data.pagination);
        if (typeof res.data.summary?.unread === 'number') {
          setUnreadCount(res.data.summary.unread);
        }
      }
    } catch (err) {
      console.error('[NOTIFICATIONS_FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 3. Fetch Preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationService.getPreferences();
      if (res?.success && res.data) {
        setPreferences(res.data);
      }
    } catch {
      // Ignore preference fetch errors
    }
  }, [user]);

  // 4. Update Preferences
  const updatePreferences = useCallback(async (newPrefs) => {
    try {
      const res = await notificationService.updatePreferences(newPrefs);
      if (res?.success && res.data) {
        setPreferences(res.data);
        return res.data;
      }
    } catch (err) {
      console.error('[NOTIFICATIONS_PREFS_ERROR]', err);
      throw err;
    }
  }, []);

  // 5. Sync Alerts (Scans database records for real overdue/critical triggers)
  const syncAlerts = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const res = await notificationService.syncAlerts();
      await Promise.all([refreshUnreadCount(), fetchNotifications({ status: 'all' })]);
      return res?.data;
    } catch (err) {
      console.error('[NOTIFICATIONS_SYNC_ERROR]', err);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [user, refreshUnreadCount, fetchNotifications]);

  // 6. Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => {
          const nid = n._id || n.id;
          return nid === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n;
        })
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setSummary((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        read: prev.read + 1,
      }));
    } catch (err) {
      console.error('[NOTIFICATIONS_MARK_READ_ERROR]', err);
      throw err;
    }
  }, []);

  // 7. Mark all as read
  const markAllAsRead = useCallback(async (category = 'all') => {
    try {
      await notificationService.markAllAsRead(category);
      setNotifications((prev) =>
        prev.map((n) =>
          category === 'all' || n.category === category
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      if (category === 'all') {
        setUnreadCount(0);
        setSummary((prev) => ({ ...prev, unread: 0, read: prev.total }));
      } else {
        await refreshUnreadCount();
      }
    } catch (err) {
      console.error('[NOTIFICATIONS_MARK_ALL_READ_ERROR]', err);
      throw err;
    }
  }, [refreshUnreadCount]);

  // 8. Delete notification
  const deleteNotification = useCallback(async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => {
        const deleted = prev.find((n) => (n._id || n.id) === id);
        if (deleted && !deleted.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => (n._id || n.id) !== id);
      });
      setSummary((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
    } catch (err) {
      console.error('[NOTIFICATIONS_DELETE_ERROR]', err);
      throw err;
    }
  }, []);

  // 9. Clear all read notifications
  const clearReadNotifications = useCallback(async () => {
    try {
      await notificationService.clearReadNotifications();
      setNotifications((prev) => prev.filter((n) => !n.isRead));
      setSummary((prev) => ({
        ...prev,
        total: prev.unread,
        read: 0,
      }));
    } catch (err) {
      console.error('[NOTIFICATIONS_CLEAR_READ_ERROR]', err);
      throw err;
    }
  }, []);

  // 10. Dismiss live toast alert
  const dismissLiveAlert = useCallback(() => {
    setLatestLiveAlert(null);
  }, []);

  // 11. Initial data hydration effect (async)
  useEffect(() => {
    let isMounted = true;
    if (!user) return;

    const hydrateInitialData = async () => {
      try {
        const [unreadRes, prefsRes] = await Promise.all([
          notificationService.getUnreadCount(),
          notificationService.getPreferences(),
        ]);
        if (isMounted) {
          if (unreadRes?.success && typeof unreadRes.data?.unreadCount === 'number') {
            setUnreadCount(unreadRes.data.unreadCount);
          }
          if (prefsRes?.success && prefsRes.data) {
            setPreferences(prefsRes.data);
          }
        }
      } catch {
        // Ignore hydration errors
      }
    };

    hydrateInitialData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // 12. Manage Socket.IO lifecycle
  useEffect(() => {
    const token = getStoredToken();
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
      /\/api\/?$/,
      ''
    );

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketStatus('connected');
    });

    socket.on('disconnect', () => {
      setSocketStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setSocketStatus('disconnected');
    });

    socket.on('notification:unreadCount', (data) => {
      if (typeof data?.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    });

    socket.on('notification:new', (newNotif) => {
      setNotifications((prev) => [
        newNotif,
        ...prev.filter((n) => (n._id || n.id) !== (newNotif._id || newNotif.id)),
      ]);
      setUnreadCount((c) => c + 1);
      setSummary((s) => ({
        ...s,
        total: s.total + 1,
        unread: s.unread + 1,
        critical: newNotif.severity === 'critical' ? s.critical + 1 : s.critical,
        byCategory: {
          ...s.byCategory,
          [newNotif.category]: (s.byCategory[newNotif.category] || 0) + 1,
        },
      }));
      setLatestLiveAlert(newNotif);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const value = {
    unreadCount,
    notifications,
    summary,
    pagination,
    preferences,
    loading,
    syncing,
    socketStatus,
    latestLiveAlert,
    dismissLiveAlert,
    fetchNotifications,
    refreshUnreadCount,
    syncAlerts,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearReadNotifications,
    fetchPreferences,
    updatePreferences,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
