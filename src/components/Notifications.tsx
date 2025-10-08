import React, { useState, useEffect } from 'react';
import { Bell, X, Check, ExternalLink } from 'lucide-react';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { notificationService, Notification } from '../services/notificationService';
import { useNavigate } from 'react-router-dom';

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({ isOpen, onClose }) => {
  const { user } = useSupabaseAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications when component mounts or user changes
  useEffect(() => {
    if (user?.uid && isOpen) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user?.uid, isOpen]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.uid) return;

    const subscription = notificationService.subscribeToNotifications(user.uid, (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.uid]);

  const fetchNotifications = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const data = await notificationService.getNotifications(user.uid);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user?.uid) return;
    
    try {
      const count = await notificationService.getUnreadCount(user.uid);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.is_read) return;
    
    try {
      const success = await notificationService.markAsRead(notification.id);
      if (success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.uid) return;
    
    try {
      const success = await notificationService.markAllAsRead(user.uid);
      if (success) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    handleMarkAsRead(notification);

    // Handle different notification types
    switch (notification.type) {
      case 'streamer_live':
        if (notification.metadata.stream_id) {
          // Navigate to the live stream
          navigate(`/live/${notification.metadata.stream_id}`);
        }
        break;
      case 'streaming_limit_warning':
      case 'streaming_limit_reached':
        // Navigate to dashboard to see usage details
        navigate('/dashboard');
        break;
      case 'follow':
        // Navigate to profile or handle follow notification
        break;
      default:
        // Handle other notification types
        break;
    }
  };

  const getStreamerAvatar = (notification: Notification) => {
    // For streamer_live notifications, use the streamer's avatar from metadata
    if (notification.type === 'streamer_live' && notification.metadata.streamer_avatar) {
      return notification.metadata.streamer_avatar;
    }
    
    // Fallback to default avatar
    return null;
  };

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'streaming_limit_warning':
        return '⚠️';
      case 'streaming_limit_reached':
        return '🚫';
      case 'streamer_live':
        return '🔴';
      case 'follow':
        return '👤';
      default:
        return '📢';
    }
  };

  const getStreamerName = (notification: Notification) => {
    // For streamer_live notifications, use the streamer's name from metadata
    if (notification.type === 'streamer_live' && notification.metadata.streamer_name) {
      return notification.metadata.streamer_name;
    }
    
    // Extract name from title for other notification types
    return notification.title.split(' is live!')[0] || 'Unknown User';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Notifications Panel */}
      <div className="relative w-96 max-h-[80vh] bg-white dark:bg-chocolate-800 rounded-lg shadow-xl border border-chocolate-200 dark:border-chocolate-600 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-chocolate-200 dark:border-chocolate-600">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-chocolate-600 dark:text-chocolate-400" />
            <h3 className="text-lg font-semibold text-chocolate-900 dark:text-white">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-chocolate-600 dark:text-chocolate-400 hover:text-chocolate-800 dark:hover:text-chocolate-200"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-chocolate-400 hover:text-chocolate-600 dark:text-chocolate-500 dark:hover:text-chocolate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
          {isLoading ? (
            <div className="p-4 text-center text-chocolate-600 dark:text-chocolate-400">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-chocolate-600 dark:text-chocolate-400">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-sm mt-2">You'll see notifications here when streamers you follow go live</p>
            </div>
          ) : (
            <div className="divide-y divide-chocolate-200 dark:divide-chocolate-600">
              {notifications.map((notification) => {
                const streamerAvatar = getStreamerAvatar(notification);
                const streamerName = getStreamerName(notification);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-chocolate-50 dark:hover:bg-chocolate-700 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Avatar/Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-chocolate-200 dark:bg-chocolate-600 flex items-center justify-center overflow-hidden">
                          {notification.type.startsWith('streaming_limit') ? (
                            <span className="text-2xl">
                              {getNotificationIcon(notification)}
                            </span>
                          ) : streamerAvatar ? (
                            <img
                              src={streamerAvatar}
                              alt={streamerName}
                              className="w-10 h-10 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent && !parent.querySelector('span')) {
                                  const fallback = document.createElement('span');
                                  fallback.className = 'text-chocolate-700 dark:text-chocolate-300 font-semibold';
                                  fallback.textContent = streamerName.charAt(0);
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          ) : (
                            <span className="text-chocolate-700 dark:text-chocolate-300 font-semibold">
                              {streamerName.charAt(0)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              !notification.is_read 
                                ? 'text-chocolate-900 dark:text-white' 
                                : 'text-chocolate-700 dark:text-chocolate-300'
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-chocolate-600 dark:text-chocolate-400 mt-1">
                              {notification.body}
                            </p>
                            <p className="text-xs text-chocolate-500 dark:text-chocolate-500 mt-2">
                              {notificationService.formatNotificationTime(notification.created_at)}
                            </p>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex items-center space-x-1 ml-2">
                            {!notification.is_read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification);
                                }}
                                className="p-1 text-chocolate-400 hover:text-chocolate-600 dark:text-chocolate-500 dark:hover:text-chocolate-300"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {notification.type === 'streamer_live' && (
                              <ExternalLink className="w-4 h-4 text-chocolate-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications; 