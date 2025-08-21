import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { notificationService } from '../services/notificationService';
import Notifications from './Notifications';

const NotificationBell: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Fetch unread count when component mounts or user changes
  useEffect(() => {
    if (user?.uid) {
      fetchUnreadCount();
    }
  }, [user?.uid]);

  // Subscribe to real-time notification updates
  useEffect(() => {
    if (!user?.uid) return;

    const subscription = notificationService.subscribeToNotifications(user.uid, () => {
      // Increment unread count when new notification arrives
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.uid]);

  const fetchUnreadCount = async () => {
    if (!user?.uid) return;
    
    try {
      const count = await notificationService.getUnreadCount(user.uid);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleBellClick = () => {
    setIsNotificationsOpen(true);
    // Refresh unread count when opening notifications
    fetchUnreadCount();
  };

  const handleNotificationsClose = () => {
    setIsNotificationsOpen(false);
    // Refresh unread count when closing notifications
    fetchUnreadCount();
  };

  if (!user) return null;

  return (
    <>
      <button
        onClick={handleBellClick}
        className="relative p-2 text-chocolate-600 dark:text-chocolate-400 hover:text-chocolate-800 dark:hover:text-chocolate-200 transition-colors"
        title="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <Notifications 
        isOpen={isNotificationsOpen} 
        onClose={handleNotificationsClose} 
      />
    </>
  );
};

export default NotificationBell; 