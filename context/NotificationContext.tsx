
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { SystemNotification, UserRole } from '../types';
import { sendSystemNotification as sendCloudNotification, fetchSystemNotifications as fetchCloudNotifications, markNotificationAsRead as markCloudNotificationAsRead } from '../services/cloudService';

// Short notification beep sound (Base64 MP3) - Replaced with a shorter, verified base64 string
const NOTIFICATION_SOUND = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2YzU4LjY2LjEwMAAAAAAAAAAAAAAA//uQRAAAAwBAACDAAAAjAAAQAAAACAA/uQYyBBkAAACoAAAAggAAADXAAAAuQMQg/uQcQcCAIAAAaAAAAXgAAAAEAAADuQYgcsg/uQcQsBAJAAAKdAAAAOAAAABIAAAACOQMQcQAAAUoAAAAMgAAABQAAAAAAAAA//uQZAUAAAwBAAARpGkHQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7cQxAQkAAAAAAAAAAAAAAAAAAAAAAAAAAARSzwAAAAAAAAAAESwAAAAAAAAAAFYuQAAAMBHhUAAAAAAD6AAAAAAAAA////4eAAAk9Tei";

interface NotificationContextType {
  notifications: SystemNotification[];
  addNotification: (notification: SystemNotification, playSound?: boolean) => void;
  markNotificationAsRead: (id: string, userId: string) => void;
  playAlarmSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getSessionDetails = useCallback(() => {
    const userRole = localStorage.getItem('user_role') as UserRole | null;
    const corporateId = localStorage.getItem('app_session_id'); // For corporate, session ID is their email
    return { userRole, corporateId: corporateId === 'admin' ? 'admin' : corporateId };
  }, []);

  // Fetch initial notifications and set up listener
  useEffect(() => {
    const { userRole, corporateId } = getSessionDetails();
    if (!userRole) return;

    const loadNotifications = async () => {
      const fetchedNotifications = await fetchCloudNotifications(userRole, corporateId || undefined);
      // Filter notifications to only show those relevant to the current user (role and corporateId)
      const userId = localStorage.getItem('app_session_id') || 'guest';
      const relevantNotifications = fetchedNotifications.filter(n => {
        const isTargetRole = n.targetRoles.includes(userRole);
        const isTargetCorporate = !n.corporateId || n.corporateId === 'admin' || n.corporateId === corporateId;
        return isTargetRole && isTargetCorporate;
      }).map(n => ({
        ...n,
        // Client-side read status: check if the current user has marked it as read in 'readBy' array
        read: (n as any).readBy?.includes(userId) || false
      }));

      // Check for new unread notifications compared to current state
      const existingUnreadIds = notifications.filter(n => !n.read).map(n => n.id);
      const newUnreadNotifications = relevantNotifications.filter(n => !n.read && !existingUnreadIds.includes(n.id));

      if (newUnreadNotifications.length > 0) {
        playAlarmSound();
      }

      setNotifications(relevantNotifications);
    };

    loadNotifications();

    // Set up interval to poll for new notifications (Firestore listener would be better in real app)
    const interval = setInterval(loadNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [getSessionDetails]); // Re-run if session details change (e.g., login/logout)

  const playAlarmSound = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(NOTIFICATION_SOUND);
      audioRef.current.volume = 0.6; // Adjust volume as needed
    }
    audioRef.current.play().catch(e => console.warn("Failed to play notification sound:", e));
  }, []);

  const addNotification = useCallback((newNotification: SystemNotification, playSound: boolean = true) => {
    setNotifications(prev => {
      // Prevent duplicates if already present
      if (prev.some(n => n.id === newNotification.id)) {
        return prev;
      }
      if (playSound) {
        playAlarmSound();
      }
      return [newNotification, ...prev];
    });
  }, [playAlarmSound]);

  const markNotificationAsRead = useCallback(async (id: string, userId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    await markCloudNotificationAsRead(id, userId);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markNotificationAsRead, playAlarmSound }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
