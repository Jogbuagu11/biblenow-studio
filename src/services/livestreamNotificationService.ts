import { supabase } from '../config/supabase';

export interface LivestreamNotificationData {
  streamer_id: string;
  stream_id: string;
  stream_title: string;
  stream_description?: string;
  stream_url: string;
}

export class LivestreamNotificationService {
  /**
   * Send email notifications to all followers when a streamer starts a livestream
   */
  static async notifyFollowersOfLivestream(data: LivestreamNotificationData): Promise<{
    success: boolean;
    notificationsSent: number;
    totalFollowers: number;
    errors?: string[];
  }> {
    try {
      console.log('Sending livestream notifications to followers:', data);

      // Call the Supabase Edge Function
      const { data: result, error } = await supabase.functions.invoke('send-livestream-notification', {
        body: data
      });

      if (error) {
        console.error('Error calling livestream notification function:', error);
        throw new Error(`Failed to send notifications: ${error.message}`);
      }

      console.log('Livestream notifications sent successfully:', result);
      return result;

    } catch (error) {
      console.error('Error in LivestreamNotificationService:', error);
      throw error;
    }
  }

  /**
   * Get user's email preferences
   */
  static async getEmailPreferences(userId: string): Promise<{
    livestreamNotifications: boolean;
    streamingLimitEmails: boolean;
  }> {
    try {
      console.log('🔍 LivestreamNotificationService: Getting email preferences for user:', userId);
      
      // First try the email_preferences column
      const { data, error } = await supabase
        .from('verified_profiles')
        .select('email_preferences')
        .eq('id', userId)
        .single();

      console.log('🔍 LivestreamNotificationService: Query result:', { data, error });

      if (error) {
        console.error('❌ LivestreamNotificationService: Error fetching email preferences:', error);
        console.error('❌ LivestreamNotificationService: Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // If email_preferences column doesn't exist, try the preferences column as fallback
        console.log('🔍 LivestreamNotificationService: Trying fallback with preferences column...');
        
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('verified_profiles')
          .select('preferences')
          .eq('id', userId)
          .single();

        console.log('🔍 LivestreamNotificationService: Fallback query result:', { data: fallbackData, error: fallbackError });

        if (fallbackError) {
          console.error('❌ LivestreamNotificationService: Fallback query also failed:', fallbackError);
          return {
            livestreamNotifications: true, // Default to enabled
            streamingLimitEmails: true
          };
        }

        const fallbackPrefs = fallbackData?.preferences || {};
        console.log('🔍 LivestreamNotificationService: Fallback preferences:', fallbackPrefs);
        
        return {
          livestreamNotifications: true, // Default for livestream notifications
          streamingLimitEmails: fallbackPrefs.streamingLimitEmails !== false
        };
      }

      const preferences = data?.email_preferences || {};
      console.log('🔍 LivestreamNotificationService: Raw preferences:', preferences);
      
      const result = {
        livestreamNotifications: preferences.livestreamNotifications !== false,
        streamingLimitEmails: preferences.streamingLimitEmails !== false
      };
      
      console.log('✅ LivestreamNotificationService: Returning preferences:', result);
      return result;

    } catch (error) {
      console.error('❌ LivestreamNotificationService: Error in getEmailPreferences:', error);
      console.error('❌ LivestreamNotificationService: Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      
      return {
        livestreamNotifications: true,
        streamingLimitEmails: true
      };
    }
  }

  /**
   * Update user's email preferences
   */
  static async updateEmailPreferences(
    userId: string, 
    preferences: {
      livestreamNotifications?: boolean;
      streamingLimitEmails?: boolean;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('verified_profiles')
        .update({
          email_preferences: preferences
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating email preferences:', error);
        throw new Error(`Failed to update preferences: ${error.message}`);
      }

      console.log('Email preferences updated successfully');

    } catch (error) {
      console.error('Error in updateEmailPreferences:', error);
      throw error;
    }
  }

  /**
   * Get followers count for a user
   */
  static async getFollowersCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      if (error) {
        console.error('Error fetching followers count:', error);
        return 0;
      }

      return count || 0;

    } catch (error) {
      console.error('Error in getFollowersCount:', error);
      return 0;
    }
  }

  /**
   * Get following count for a user
   */
  static async getFollowingCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      if (error) {
        console.error('Error fetching following count:', error);
        return 0;
      }

      return count || 0;

    } catch (error) {
      console.error('Error in getFollowingCount:', error);
      return 0;
    }
  }
}
