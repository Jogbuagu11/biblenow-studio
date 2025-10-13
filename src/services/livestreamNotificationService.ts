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
      const { data, error } = await supabase
        .from('verified_profiles')
        .select('email_preferences')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching email preferences:', error);
        return {
          livestreamNotifications: true, // Default to enabled
          streamingLimitEmails: true
        };
      }

      const preferences = data?.email_preferences || {};
      return {
        livestreamNotifications: preferences.livestreamNotifications !== false,
        streamingLimitEmails: preferences.streamingLimitEmails !== false
      };

    } catch (error) {
      console.error('Error in getEmailPreferences:', error);
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
