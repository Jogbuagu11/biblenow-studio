import { supabase } from '../config/supabase';

export interface StudioEmailPreferences {
  livestreamNotifications: boolean;
  streamingLimitEmails: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
  systemNotifications: boolean;
}

export class StudioEmailPreferencesService {
  /**
   * Get user's email preferences from studio_email_preferences table
   */
  static async getEmailPreferences(userId: string): Promise<StudioEmailPreferences> {
    try {
      const { data, error } = await supabase
        .from('studio_email_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching email preferences:', error);
        throw new Error(`Failed to fetch preferences: ${error.message}`);
      }

      // If no preferences found, return defaults
      if (!data) {
        return {
          livestreamNotifications: true,
          streamingLimitEmails: true,
          weeklyDigest: false,
          marketingEmails: false,
          systemNotifications: true
        };
      }

      return {
        livestreamNotifications: data.livestream_notifications,
        streamingLimitEmails: data.streaming_limit_emails,
        weeklyDigest: data.weekly_digest,
        marketingEmails: data.marketing_emails,
        systemNotifications: data.system_notifications
      };

    } catch (error) {
      console.error('Error in getEmailPreferences:', error);
      // Return default preferences on error
      return {
        livestreamNotifications: true,
        streamingLimitEmails: true,
        weeklyDigest: false,
        marketingEmails: false,
        systemNotifications: true
      };
    }
  }

  /**
   * Update user's email preferences
   */
  static async updateEmailPreferences(
    userId: string, 
    preferences: Partial<StudioEmailPreferences>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('studio_email_preferences')
        .upsert({
          user_id: userId,
          livestream_notifications: preferences.livestreamNotifications,
          streaming_limit_emails: preferences.streamingLimitEmails,
          weekly_digest: preferences.weeklyDigest,
          marketing_emails: preferences.marketingEmails,
          system_notifications: preferences.systemNotifications,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

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
   * Update specific email preference
   */
  static async updateSpecificPreference(
    userId: string,
    preferenceKey: keyof StudioEmailPreferences,
    value: boolean
  ): Promise<void> {
    try {
      const updateData: any = {
        user_id: userId,
        updated_at: new Date().toISOString()
      };

      // Map the preference key to the database column name
      switch (preferenceKey) {
        case 'livestreamNotifications':
          updateData.livestream_notifications = value;
          break;
        case 'streamingLimitEmails':
          updateData.streaming_limit_emails = value;
          break;
        case 'weeklyDigest':
          updateData.weekly_digest = value;
          break;
        case 'marketingEmails':
          updateData.marketing_emails = value;
          break;
        case 'systemNotifications':
          updateData.system_notifications = value;
          break;
        default:
          throw new Error(`Unknown preference key: ${preferenceKey}`);
      }

      const { error } = await supabase
        .from('studio_email_preferences')
        .upsert(updateData, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating specific email preference:', error);
        throw new Error(`Failed to update ${preferenceKey}: ${error.message}`);
      }

      console.log(`Email preference ${preferenceKey} updated to ${value}`);

    } catch (error) {
      console.error('Error in updateSpecificPreference:', error);
      throw error;
    }
  }

  /**
   * Create default email preferences for a user
   */
  static async createDefaultPreferences(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('studio_email_preferences')
        .insert({
          user_id: userId,
          livestream_notifications: true,
          streaming_limit_emails: true,
          weekly_digest: false,
          marketing_emails: false,
          system_notifications: true
        });

      if (error) {
        console.error('Error creating default email preferences:', error);
        throw new Error(`Failed to create default preferences: ${error.message}`);
      }

      console.log('Default email preferences created successfully');

    } catch (error) {
      console.error('Error in createDefaultPreferences:', error);
      throw error;
    }
  }

  /**
   * Get all users with specific email preference enabled
   */
  static async getUsersWithPreference(
    preferenceKey: keyof StudioEmailPreferences,
    enabled: boolean = true
  ): Promise<string[]> {
    try {
      let columnName: string;
      switch (preferenceKey) {
        case 'livestreamNotifications':
          columnName = 'livestream_notifications';
          break;
        case 'streamingLimitEmails':
          columnName = 'streaming_limit_emails';
          break;
        case 'weeklyDigest':
          columnName = 'weekly_digest';
          break;
        case 'marketingEmails':
          columnName = 'marketing_emails';
          break;
        case 'systemNotifications':
          columnName = 'system_notifications';
          break;
        default:
          throw new Error(`Unknown preference key: ${preferenceKey}`);
      }

      const { data, error } = await supabase
        .from('studio_email_preferences')
        .select('user_id')
        .eq(columnName, enabled);

      if (error) {
        console.error('Error fetching users with preference:', error);
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      return data?.map(item => item.user_id) || [];

    } catch (error) {
      console.error('Error in getUsersWithPreference:', error);
      throw error;
    }
  }

  /**
   * Get email preferences for multiple users
   */
  static async getBulkEmailPreferences(userIds: string[]): Promise<Map<string, StudioEmailPreferences>> {
    try {
      const { data, error } = await supabase
        .from('studio_email_preferences')
        .select('*')
        .in('user_id', userIds);

      if (error) {
        console.error('Error fetching bulk email preferences:', error);
        throw new Error(`Failed to fetch bulk preferences: ${error.message}`);
      }

      const preferencesMap = new Map<string, StudioEmailPreferences>();

      // Add preferences for users that have them
      data?.forEach(item => {
        preferencesMap.set(item.user_id, {
          livestreamNotifications: item.livestream_notifications,
          streamingLimitEmails: item.streaming_limit_emails,
          weeklyDigest: item.weekly_digest,
          marketingEmails: item.marketing_emails,
          systemNotifications: item.system_notifications
        });
      });

      // Add default preferences for users that don't have any
      userIds.forEach(userId => {
        if (!preferencesMap.has(userId)) {
          preferencesMap.set(userId, {
            livestreamNotifications: true,
            streamingLimitEmails: true,
            weeklyDigest: false,
            marketingEmails: false,
            systemNotifications: true
          });
        }
      });

      return preferencesMap;

    } catch (error) {
      console.error('Error in getBulkEmailPreferences:', error);
      throw error;
    }
  }
}
