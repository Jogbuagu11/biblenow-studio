import { supabase } from '../config/supabase';
import { emailService } from './emailService';

export interface StreamingLimitNotification {
  notification_id: string;
  user_id: string;
  user_email: string;
  user_first_name: string;
  notification_type: 'warning' | 'reached';
  usage_percentage: number;
  remaining_minutes: number;
  reset_date: string;
}

export class StreamingLimitNotificationService {
  /**
   * Process pending streaming limit notifications and send emails
   */
  static async processPendingNotifications(): Promise<{
    processed: number;
    sent: number;
    errors: number;
  }> {
    console.log('🔔 [StreamingLimitNotificationService] Starting notification processing...');
    
    let processed = 0;
    let sent = 0;
    let errors = 0;

    try {
      // Get pending notifications from the database
      const { data: notifications, error: fetchError } = await supabase
        .rpc('process_pending_streaming_notifications');

      if (fetchError) {
        console.error('❌ [StreamingLimitNotificationService] Error fetching notifications:', fetchError);
        return { processed, sent, errors: 1 };
      }

      if (!notifications || notifications.length === 0) {
        console.log('✅ [StreamingLimitNotificationService] No pending notifications found');
        return { processed, sent, errors };
      }

      console.log(`📧 [StreamingLimitNotificationService] Processing ${notifications.length} pending notifications`);

      // Process each notification
      for (const notification of notifications) {
        processed++;
        
        try {
          console.log(`🔍 [StreamingLimitNotificationService] Processing notification ${notification.notification_id} (${notification.notification_type}) for user ${notification.user_id}`);
          
          let emailSent = false;
          
          // Send appropriate email based on notification type
          if (notification.notification_type === 'warning') {
            emailSent = await emailService.sendWeeklyStreamingLimitWarning(
              notification.user_email,
              notification.user_first_name || 'User',
              notification.reset_date,
              notification.remaining_minutes,
              Math.round(notification.remaining_minutes / (notification.usage_percentage / 100)) // Calculate total limit
            );
          } else if (notification.notification_type === 'reached') {
            emailSent = await emailService.sendWeeklyStreamingLimitReached(
              notification.user_email,
              notification.user_first_name || 'User',
              notification.reset_date
            );
          }

          if (emailSent) {
            sent++;
            console.log(`✅ [StreamingLimitNotificationService] Email sent successfully for notification ${notification.notification_id}`);
          } else {
            console.warn(`⚠️ [StreamingLimitNotificationService] Failed to send email for notification ${notification.notification_id}`);
          }

          // Mark notification as processed
          const { error: markError } = await supabase
            .rpc('mark_notification_processed', {
              notification_id_param: notification.notification_id,
              email_sent_param: emailSent
            });

          if (markError) {
            console.error(`❌ [StreamingLimitNotificationService] Error marking notification as processed:`, markError);
            errors++;
          }

        } catch (error) {
          console.error(`❌ [StreamingLimitNotificationService] Error processing notification ${notification.notification_id}:`, error);
          errors++;
          
          // Mark notification as processed even if email failed
          try {
            await supabase
              .rpc('mark_notification_processed', {
                notification_id_param: notification.notification_id,
                email_sent_param: false
              });
          } catch (markError) {
            console.error(`❌ [StreamingLimitNotificationService] Error marking failed notification as processed:`, markError);
          }
        }
      }

      console.log(`✅ [StreamingLimitNotificationService] Processing complete: ${processed} processed, ${sent} sent, ${errors} errors`);

    } catch (error) {
      console.error('❌ [StreamingLimitNotificationService] Unexpected error:', error);
      errors++;
    }

    return { processed, sent, errors };
  }

  /**
   * Get current streaming usage for a user
   */
  static async getUserStreamingUsage(userId: string): Promise<{
    currentUsage: number;
    limit: number;
    usagePercentage: number;
    remainingMinutes: number;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('test_streaming_limit_system', { test_user_id: userId });

      if (error) {
        console.error('❌ [StreamingLimitNotificationService] Error getting user streaming usage:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No usage data found for user');
      }

      const usage = data[0];
      return {
        currentUsage: usage.current_usage || 0,
        limit: usage.limit_minutes || 0,
        usagePercentage: usage.usage_percentage || 0,
        remainingMinutes: usage.remaining_minutes || 0
      };

    } catch (error) {
      console.error('❌ [StreamingLimitNotificationService] Error getting user streaming usage:', error);
      throw error;
    }
  }

  /**
   * Manually trigger notification check for a user (for testing)
   */
  static async triggerNotificationCheck(userId: string): Promise<{
    notificationsCreated: number;
    currentUsage: number;
    limit: number;
    usagePercentage: number;
  }> {
    try {
      // Get current usage
      const usage = await this.getUserStreamingUsage(userId);
      
      // Check if we should create notifications
      let notificationsCreated = 0;
      
      if (usage.usagePercentage >= 75 && usage.usagePercentage < 100) {
        // Check if warning notification already exists this week
        const { data: existingWarning } = await supabase
          .from('streaming_limit_notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'warning')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!existingWarning || existingWarning.length === 0) {
          // Create warning notification
          const { error } = await supabase
            .from('streaming_limit_notifications')
            .insert({
              user_id: userId,
              type: 'warning',
              usage_percentage: usage.usagePercentage,
              current_minutes: usage.currentUsage,
              limit_minutes: usage.limit,
              remaining_minutes: usage.remainingMinutes,
              reset_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });

          if (!error) {
            notificationsCreated++;
            console.log(`✅ [StreamingLimitNotificationService] Created warning notification for user ${userId}`);
          }
        }
      }

      if (usage.usagePercentage >= 100) {
        // Check if limit reached notification already exists this week
        const { data: existingReached } = await supabase
          .from('streaming_limit_notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'reached')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!existingReached || existingReached.length === 0) {
          // Create limit reached notification
          const { error } = await supabase
            .from('streaming_limit_notifications')
            .insert({
              user_id: userId,
              type: 'reached',
              usage_percentage: usage.usagePercentage,
              current_minutes: usage.currentUsage,
              limit_minutes: usage.limit,
              remaining_minutes: 0,
              reset_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });

          if (!error) {
            notificationsCreated++;
            console.log(`✅ [StreamingLimitNotificationService] Created limit reached notification for user ${userId}`);
          }
        }
      }

      return {
        notificationsCreated,
        currentUsage: usage.currentUsage,
        limit: usage.limit,
        usagePercentage: usage.usagePercentage
      };

    } catch (error) {
      console.error('❌ [StreamingLimitNotificationService] Error triggering notification check:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(): Promise<{
    totalNotifications: number;
    pendingNotifications: number;
    sentNotifications: number;
    warningNotifications: number;
    reachedNotifications: number;
  }> {
    try {
      const { data: stats, error } = await supabase
        .from('streaming_limit_notifications')
        .select('type, email_sent, processed_at');

      if (error) {
        console.error('❌ [StreamingLimitNotificationService] Error getting notification stats:', error);
        throw error;
      }

      const totalNotifications = stats?.length || 0;
      const pendingNotifications = stats?.filter(n => !n.processed_at).length || 0;
      const sentNotifications = stats?.filter(n => n.email_sent).length || 0;
      const warningNotifications = stats?.filter(n => n.type === 'warning').length || 0;
      const reachedNotifications = stats?.filter(n => n.type === 'reached').length || 0;

      return {
        totalNotifications,
        pendingNotifications,
        sentNotifications,
        warningNotifications,
        reachedNotifications
      };

    } catch (error) {
      console.error('❌ [StreamingLimitNotificationService] Error getting notification stats:', error);
      throw error;
    }
  }
}
