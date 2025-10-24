// Independent Email Service
// This service can send streaming limit emails without relying on database triggers

import { supabase } from '../config/supabase';

export interface StreamingUsageInfo {
  user_id: string;
  email: string;
  first_name: string;
  current_minutes: number;
  limit_minutes: number;
  usage_percentage: number;
  needs_warning_email: boolean;
  needs_reached_email: boolean;
  last_warning_sent?: string;
  last_reached_sent?: string;
}

export interface EmailSendResult {
  user_id: string;
  email: string;
  first_name: string;
  usage_percentage: number;
  current_minutes: number;
  limit_minutes: number;
  email_type: string;
  email_sent: boolean;
  error_message?: string;
}

export interface EmailSummary {
  total_users_checked: number;
  emails_sent: number;
  errors: number;
}

export class IndependentEmailService {
  /**
   * Check streaming usage for all users
   */
  static async checkAllUsersStreamingUsage(): Promise<StreamingUsageInfo[]> {
    try {
      console.log('🔍 [IndependentEmailService] Checking all users streaming usage...');
      
      const { data, error } = await supabase.rpc('check_all_users_streaming_usage');
      
      if (error) {
        console.error('❌ [IndependentEmailService] Error checking usage:', error);
        throw error;
      }
      
      console.log(`✅ [IndependentEmailService] Found ${data?.length || 0} users with streaming data`);
      return data || [];
    } catch (error) {
      console.error('❌ [IndependentEmailService] Error in checkAllUsersStreamingUsage:', error);
      throw error;
    }
  }

  /**
   * Send streaming limit emails to all users who need them
   */
  static async sendAllPendingEmails(): Promise<EmailSummary> {
    try {
      console.log('📧 [IndependentEmailService] Sending all pending streaming limit emails...');
      
      const { data, error } = await supabase.rpc('send_all_pending_streaming_emails');
      
      if (error) {
        console.error('❌ [IndependentEmailService] Error sending emails:', error);
        throw error;
      }
      
      const result = data?.[0] || { total_users_checked: 0, emails_sent: 0, errors: 0 };
      console.log(`✅ [IndependentEmailService] Email summary:`, result);
      
      return result;
    } catch (error) {
      console.error('❌ [IndependentEmailService] Error in sendAllPendingEmails:', error);
      throw error;
    }
  }

  /**
   * Send streaming limit emails for a specific user
   */
  static async sendEmailsForUser(userId: string, forceSend: boolean = false): Promise<EmailSendResult[]> {
    try {
      console.log(`📧 [IndependentEmailService] Sending emails for user ${userId} (force: ${forceSend})...`);
      
      const { data, error } = await supabase.rpc('send_streaming_limit_emails_manual', {
        target_user_id: userId,
        force_send: forceSend
      });
      
      if (error) {
        console.error('❌ [IndependentEmailService] Error sending emails for user:', error);
        throw error;
      }
      
      console.log(`✅ [IndependentEmailService] Sent emails for user ${userId}:`, data);
      return data || [];
    } catch (error) {
      console.error('❌ [IndependentEmailService] Error in sendEmailsForUser:', error);
      throw error;
    }
  }

  /**
   * Manually add streaming minutes for testing
   */
  static async addStreamingMinutes(
    userId: string, 
    minutes: number, 
    weekStartDate?: string
  ): Promise<{
    user_id: string;
    minutes_added: number;
    total_minutes: number;
    usage_percentage: number;
    limit_minutes: number;
    email_triggered: boolean;
  }[]> {
    try {
      console.log(`⏱️ [IndependentEmailService] Adding ${minutes} minutes for user ${userId}...`);
      
      const { data, error } = await supabase.rpc('add_streaming_minutes_manual', {
        target_user_id: userId,
        minutes_to_add: minutes,
        week_start_date: weekStartDate || null
      });
      
      if (error) {
        console.error('❌ [IndependentEmailService] Error adding minutes:', error);
        throw error;
      }
      
      console.log(`✅ [IndependentEmailService] Added minutes for user ${userId}:`, data);
      return data || [];
    } catch (error) {
      console.error('❌ [IndependentEmailService] Error in addStreamingMinutes:', error);
      throw error;
    }
  }

  /**
   * Test the independent email system
   */
  static async testSystem(): Promise<{
    test_name: string;
    result: string;
    details: string;
  }[]> {
    try {
      console.log('🧪 [IndependentEmailService] Testing independent email system...');
      
      const { data, error } = await supabase.rpc('test_independent_email_system');
      
      if (error) {
        console.error('❌ [IndependentEmailService] Error testing system:', error);
        throw error;
      }
      
      console.log('✅ [IndependentEmailService] System test results:', data);
      return data || [];
    } catch (error) {
      console.error('❌ [IndependentEmailService] Error in testSystem:', error);
      throw error;
    }
  }

  /**
   * Get users who need warning emails (75%+ usage)
   */
  static async getUsersNeedingWarningEmails(): Promise<StreamingUsageInfo[]> {
    try {
      const allUsers = await this.checkAllUsersStreamingUsage();
      return allUsers.filter(user => 
        user.needs_warning_email && 
        !user.last_warning_sent
      );
    } catch (error) {
      console.error('❌ [IndependentEmailService] Error getting users needing warning emails:', error);
      throw error;
    }
  }

  /**
   * Get users who need limit reached emails (100% usage)
   */
  static async getUsersNeedingReachedEmails(): Promise<StreamingUsageInfo[]> {
    try {
      const allUsers = await this.checkAllUsersStreamingUsage();
      return allUsers.filter(user => 
        user.needs_reached_email && 
        !user.last_reached_sent
      );
    } catch (error) {
      console.error('❌ [IndependentEmailService] Error getting users needing reached emails:', error);
      throw error;
    }
  }

  /**
   * Send warning emails to all users who need them
   */
  static async sendWarningEmails(): Promise<EmailSendResult[]> {
    try {
      console.log('⚠️ [IndependentEmailService] Sending warning emails...');
      
      const usersNeedingWarnings = await this.getUsersNeedingWarningEmails();
      const results: EmailSendResult[] = [];
      
      for (const user of usersNeedingWarnings) {
        try {
          const userResults = await this.sendEmailsForUser(user.user_id);
          results.push(...userResults);
        } catch (error) {
          console.error(`❌ [IndependentEmailService] Error sending warning email to ${user.email}:`, error);
          results.push({
            user_id: user.user_id,
            email: user.email,
            first_name: user.first_name,
            usage_percentage: user.usage_percentage,
            current_minutes: user.current_minutes,
            limit_minutes: user.limit_minutes,
            email_type: 'warning',
            email_sent: false,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      console.log(`✅ [IndependentEmailService] Sent ${results.length} warning emails`);
      return results;
    } catch (error) {
      console.error('❌ [IndependentEmailService] Error in sendWarningEmails:', error);
      throw error;
    }
  }

  /**
   * Send limit reached emails to all users who need them
   */
  static async sendReachedEmails(): Promise<EmailSendResult[]> {
    try {
      console.log('🚫 [IndependentEmailService] Sending limit reached emails...');
      
      const usersNeedingReached = await this.getUsersNeedingReachedEmails();
      const results: EmailSendResult[] = [];
      
      for (const user of usersNeedingReached) {
        try {
          const userResults = await this.sendEmailsForUser(user.user_id);
          results.push(...userResults);
        } catch (error) {
          console.error(`❌ [IndependentEmailService] Error sending reached email to ${user.email}:`, error);
          results.push({
            user_id: user.user_id,
            email: user.email,
            first_name: user.first_name,
            usage_percentage: user.usage_percentage,
            current_minutes: user.current_minutes,
            limit_minutes: user.limit_minutes,
            email_type: 'reached',
            email_sent: false,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      console.log(`✅ [IndependentEmailService] Sent ${results.length} limit reached emails`);
      return results;
    } catch (error) {
      console.error('❌ [IndependentEmailService] Error in sendReachedEmails:', error);
      throw error;
    }
  }
}

// Export for use in other parts of the application
export default IndependentEmailService;



