import { supabase } from '../config/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  metadata: any;
  is_read: boolean;
  created_at: string;
  processed_at?: string;
}

export class NotificationService {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isProcessing = false;

  /**
   * Check for new streaming limit notifications and send emails
   */
  static async processStreamingLimitNotifications(): Promise<void> {
    // Prevent concurrent executions
    if (this.isProcessing) {
      console.log('🔍 [NotificationService] Already processing, skipping...');
      return;
    }
    
    this.isProcessing = true;
    console.log('🔍 [NotificationService] Starting processStreamingLimitNotifications...');
    
    try {
      // Get unprocessed streaming limit notifications
      console.log('🔍 [NotificationService] Fetching unprocessed notifications...');
      const { data: notifications, error } = await supabase
        .from('studio_notifications')
        .select('*')
        .in('type', ['streaming_limit_warning', 'streaming_limit_reached'])
        .is('processed_at', null)
        .order('created_at', { ascending: true });

      console.log('🔍 [NotificationService] Query result:', { 
        count: notifications?.length || 0, 
        error: error?.message || 'none',
        notifications: notifications?.map(n => ({ id: n.id, type: n.type, user_id: n.user_id, created_at: n.created_at }))
      });

      if (error) {
        console.error('❌ [NotificationService] Error fetching notifications:', error);
        console.error('🔍 [NotificationService] Error details:', JSON.stringify(error, null, 2));
        return;
      }

      if (!notifications || notifications.length === 0) {
        console.log('ℹ️ [NotificationService] No unprocessed streaming limit notifications found');
        
        // Check if there are ANY notifications in the table for debugging
        const { data: allNotifications, error: allError } = await supabase
          .from('studio_notifications')
          .select('id, type, processed_at, created_at, user_id')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (allError) {
          console.error('🔍 [NotificationService] Error checking all notifications:', allError);
        } else {
          console.log('🔍 [NotificationService] Recent notifications in table:', allNotifications?.map(n => 
            `${n.type} (${n.processed_at ? 'processed' : 'unprocessed'}) - User: ${n.user_id} - ${n.created_at}`
          ));
        }
        return;
      }

      console.log(`📧 [NotificationService] Processing ${notifications.length} streaming limit notifications`);

      // Process each notification
      for (const notification of notifications) {
        console.log(`🔍 [NotificationService] Processing notification ${notification.id} (${notification.type}) for user ${notification.user_id}`);
        
        try {
          const metadata = notification.metadata as any;
          console.log('🔍 [NotificationService] Notification metadata:', JSON.stringify(metadata, null, 2));
          
          const requestBody = {
            user_id: notification.user_id,
            email: metadata.email,
            first_name: metadata.first_name,
            type: metadata.notification_type,
            usage_percentage: metadata.usage_percentage,
            remaining_minutes: metadata.remaining_minutes,
            reset_date: metadata.reset_date
          };

          console.log('🔍 [NotificationService] Edge function request body:', JSON.stringify(requestBody, null, 2));
          
          // Call the edge function to send email
          const { data: emailResult, error: emailError } = await supabase.functions.invoke(
            'send-streaming-limit-email',
            {
              body: requestBody
            }
          );

          console.log('🔍 [NotificationService] Edge function response:', { emailResult, emailError });

          if (emailError) {
            console.error(`❌ [NotificationService] Error sending email for notification ${notification.id}:`, emailError);
            console.error('🔍 [NotificationService] Email error details:', JSON.stringify(emailError, null, 2));
            
            // Mark as failed
            console.log(`🔍 [NotificationService] Marking notification ${notification.id} as failed...`);
            const failedUpdate = await supabase
              .from('studio_notifications')
              .update({
                processed_at: new Date().toISOString(),
                metadata: {
                  ...metadata,
                  email_status: 'failed',
                  email_error: emailError.message
                }
              })
              .eq('id', notification.id);

            console.log('🔍 [NotificationService] Failed update result:', failedUpdate);
          } else {
            console.log(`✅ [NotificationService] Email sent successfully for notification ${notification.id}`);
            console.log('🔍 [NotificationService] Email result:', JSON.stringify(emailResult, null, 2));
            
            // Mark as processed
            console.log(`🔍 [NotificationService] Marking notification ${notification.id} as processed...`);
            const updateData = {
              processed_at: new Date().toISOString(),
              metadata: {
                ...metadata,
                email_status: 'sent',
                email_result: emailResult
              }
            };

            console.log('🔍 [NotificationService] Update data:', JSON.stringify(updateData, null, 2));

            const { error: updateError } = await supabase
              .from('studio_notifications')
              .update(updateData)
              .eq('id', notification.id);

            console.log('🔍 [NotificationService] Update result:', { updateError });

            if (updateError) {
              console.error(`❌ [NotificationService] Failed to mark notification as processed:`, updateError);
              console.error('🔍 [NotificationService] Update error details:', JSON.stringify(updateError, null, 2));
            } else {
              console.log(`✅ [NotificationService] Notification ${notification.id} marked as processed`);
              
              // Verify the update
              const { data: verification, error: verifyError } = await supabase
                .from('studio_notifications')
                .select('processed_at, metadata')
                .eq('id', notification.id)
                .single();
              
              if (verifyError) {
                console.error('🔍 [NotificationService] Could not verify update:', verifyError);
              } else {
                console.log('🔍 [NotificationService] Update verified, processed_at:', verification.processed_at);
              }
            }
          }
        } catch (notificationError) {
          console.error(`💥 [NotificationService] Error processing notification ${notification.id}:`, notificationError);
          console.error('🔍 [NotificationService] Notification error stack:', notificationError instanceof Error ? notificationError.stack : 'No stack');
          console.error('🔍 [NotificationService] Notification error details:', JSON.stringify(notificationError, null, 2));
        }
      }
    } catch (error) {
      console.error('💥 [NotificationService] Error in processStreamingLimitNotifications:', error);
      console.error('🔍 [NotificationService] Main error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('🔍 [NotificationService] Main error details:', JSON.stringify(error, null, 2));
    } finally {
      this.isProcessing = false;
      console.log('🔍 [NotificationService] Finished processStreamingLimitNotifications');
    }
  }

  /**
   * Start periodic checking for notifications (call this on app startup)
   */
  static startNotificationProcessor(): void {
    // Clear any existing interval to prevent duplicates
    if (this.intervalId) {
      console.log('🔍 [NotificationService] Clearing existing notification processor interval');
      clearInterval(this.intervalId);
    }
    
    // Process immediately
    this.processStreamingLimitNotifications();
    
    // Then process every 30 seconds
    this.intervalId = setInterval(() => {
      this.processStreamingLimitNotifications();
    }, 30000);
    
    console.log('🔍 [NotificationService] Notification processor started with 30-second interval');
  }

  /**
   * Stop the notification processor
   */
  static stopNotificationProcessor(): void {
    if (this.intervalId) {
      console.log('🔍 [NotificationService] Stopping notification processor');
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get notifications for a user
   */
  static async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('studio_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return [];
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('studio_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('studio_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('studio_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time notifications for a user
   */
  static subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    const subscription = supabase
      .channel('studio_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'studio_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Format notification time for display
   */
  static formatNotificationTime(createdAt: string): string {
    const now = new Date();
    const notificationTime = new Date(createdAt);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  }
}

// Export a default instance for backward compatibility
export const notificationService = NotificationService;