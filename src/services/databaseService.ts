import { dbConfig } from '../config/firebase';
import { StreamInfo } from '../stores/livestreamStore';
import { supabase } from '../config/supabase';
import { useAuthStore } from '../stores/authStore';
import { emailService } from './emailService';

class DatabaseService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = dbConfig.apiUrl;
  }

  // Helper method for API calls
  private async apiCall(endpoint: string, options: RequestInit = {}) {
    const url = `${this.apiUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      // For now, return mock data if API is not available
      if (endpoint === '/livestreams' && options.method === 'POST') {
        const mockStream = {
          id: `mock_${Date.now()}`,
          ...JSON.parse(options.body as string),
          updated_at: new Date().toISOString(),
          is_live: false,
          viewer_count: 0,
        };
        return mockStream;
      }
      throw error;
    }
  }

  // Check if user has an active livestream
  async hasActiveLivestream(userId: string) {
    // Debug: Log the userId being used
    console.log('hasActiveLivestream called with userId:', userId);
    console.log('userId type:', typeof userId);
    
    const { data, error } = await supabase
      .from('livestreams')
      .select('id, title, started_at, ended_at')
      .eq('streamer_id', userId)
      .eq('is_live', true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    
    // Debug logging
    if (data) {
      console.log('Found active stream:', data);
    }
    
    return !!data;
  }

  // Create a scheduled stream (not live yet)
  async createScheduledStream(livestreamData: any) {
    // Get user from auth store instead of Supabase auth
    const user = useAuthStore.getState().user;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const scheduledStreamWithUser = {
        ...livestreamData,
      streamer_id: user.uid, // Use uid from auth store
        is_live: false,
        started_at: null,
        ended_at: null,
        status: 'active',
        viewer_count: 0,
        updated_at: new Date().toISOString()
    };
    
    console.log('Scheduled stream data with user ID:', JSON.stringify(scheduledStreamWithUser, null, 2));
    
    const { data, error } = await supabase
      .from('livestreams')
      .insert([scheduledStreamWithUser])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // Create a new livestream (for going live)
  async createLivestream(livestreamData: any) {
    // Debug: Log the data being sent to see if it contains category
    console.log('createLivestream called with data:', JSON.stringify(livestreamData, null, 2));
    
    // Get user from auth store instead of Supabase auth
    const user = useAuthStore.getState().user;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const livestreamWithUser = {
        ...livestreamData,
      streamer_id: user.uid, // Use uid from auth store
        is_live: true,
        started_at: new Date().toISOString(),
        ended_at: null,
        status: 'active',
        viewer_count: 0,
        updated_at: new Date().toISOString()
    };
    
    console.log('Livestream data with user ID:', JSON.stringify(livestreamWithUser, null, 2));
    
    const { data, error } = await supabase
      .from('livestreams')
      .insert([livestreamWithUser])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // Get all livestreams
  async getLivestreams(): Promise<StreamInfo[]> {
    const { data, error } = await supabase
      .from('livestreams')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  // Get livestream by ID
  async getLivestreamById(id: string): Promise<StreamInfo> {
    return this.apiCall(`/livestreams/${id}`);
  }

  // Update livestream
  async updateLivestream(id: string, updates: Partial<StreamInfo>): Promise<StreamInfo> {
    const { data, error } = await supabase
      .from('livestreams')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // Delete livestream
  async deleteLivestream(id: string): Promise<void> {
    const { error } = await supabase
      .from('livestreams')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  // Start livestream
  async startLivestream(id: string): Promise<StreamInfo> {
    const { data, error } = await supabase
      .from('livestreams')
      .update({
        is_live: true,
        started_at: new Date().toISOString(),
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // Stop livestream
  async stopLivestream(id: string): Promise<StreamInfo> {
    const { data, error } = await supabase
      .from('livestreams')
      .update({
        is_live: false,
        ended_at: new Date().toISOString(),
        status: 'ended',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // Get recent livestreams
  async getRecentLivestreams(limit: number = 10): Promise<StreamInfo[]> {
    const { data, error } = await supabase
      .from('livestreams')
      .select('*')
      .eq('is_live', false)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
  }

  // Get upcoming livestreams
  async getUpcomingLivestreams(): Promise<StreamInfo[]> {
    const { data, error } = await supabase
      .from('livestreams')
      .select('*')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }

  // Get scheduled livestreams (future streams that are not live)
  async getScheduledLivestreams(): Promise<StreamInfo[]> {
    const { data, error } = await supabase
      .from('livestreams')
      .select('*')
      .eq('is_live', false)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }

  // Get live livestreams
  async getLiveLivestreams(): Promise<StreamInfo[]> {
    return this.apiCall('/livestreams/live');
  }

  // Update viewer count
  async updateViewerCount(id: string, count: number): Promise<StreamInfo> {
    return this.apiCall(`/livestreams/${id}/viewers`, {
      method: 'PUT',
      body: JSON.stringify({ viewer_count: count }),
    });
  }

  // Get livestreams by streamer
  async getLivestreamsByStreamer(streamerId: string): Promise<StreamInfo[]> {
    return this.apiCall(`/livestreams/streamer/${streamerId}`);
  }

  // Search livestreams
  async searchLivestreams(query: string): Promise<StreamInfo[]> {
    return this.apiCall(`/livestreams/search?q=${encodeURIComponent(query)}`);
  }



  // Get livestreams by platform
  async getLivestreamsByPlatform(platform: string): Promise<StreamInfo[]> {
    return this.apiCall(`/livestreams/platform/${platform}`);
  }

  // Clean up orphaned active streams (for debugging/fixing)
  async cleanupOrphanedActiveStreams(userId: string): Promise<void> {
    const { error } = await supabase
      .from('livestreams')
      .update({
        is_live: false,
        ended_at: new Date().toISOString(),
        status: 'ended',
        updated_at: new Date().toISOString()
      })
      .eq('streamer_id', userId)
      .eq('is_live', true);
    if (error) throw new Error(error.message);
  }

  // End stream when user lands on endstream page
  async endStreamOnRedirect(userId: string): Promise<void> {
    console.log('Attempting to end stream for user:', userId);
    
    try {
      // First, check if user has any active streams
      const { data: activeStreams, error: checkError } = await supabase
        .from('livestreams')
        .select('id, title, is_live, status')
        .eq('streamer_id', userId)
        .or('is_live.eq.true,status.eq.active');
      
      if (checkError) {
        console.error('Error checking active streams:', checkError);
      } else {
        console.log('Active streams found for user:', activeStreams);
      }
      
      // Use the new comprehensive end stream function
      const { data, error } = await supabase
        .rpc('end_stream_comprehensive', {
          p_streamer_id: userId
        });
      
      if (error) {
        console.error('Error ending stream via RPC:', error);
        console.error('Error details:', error.details, error.hint, error.code);
        throw new Error(error.message);
      }
      
      console.log('End stream result:', data);
      
      if (data && data.affected_streams > 0) {
        console.log(`Successfully ended ${data.affected_streams} streams for user:`, userId);
      } else {
        console.log('No active streams found for user:', userId);
      }
      
      // Verify the streams were actually ended
      const { data: verifyStreams, error: verifyError } = await supabase
        .from('livestreams')
        .select('id, title, is_live, status, ended_at')
        .eq('streamer_id', userId)
        .or('is_live.eq.true,status.eq.active');
      
      if (verifyError) {
        console.error('Error verifying streams:', verifyError);
      } else {
        console.log('Streams after ending attempt:', verifyStreams);
      }
      
    } catch (error) {
      console.error('Error in endStreamOnRedirect:', error);
      throw error;
    }
  }

  // End stream by ID (for manual ending)
  async endStreamById(streamId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .rpc('end_stream_comprehensive', {
          p_stream_id: streamId
        });
      
      if (error) {
        console.error('Error ending stream by ID:', error);
        throw new Error(error.message);
      }
      
      console.log('End stream by ID result:', data);
      
      if (data && !data.success) {
        throw new Error(data.message || 'Failed to end stream');
      }
    } catch (error) {
      console.error('Error in endStreamById:', error);
      throw error;
    }
  }

  // Force end all active streams (admin function)
  async forceEndAllStreams(): Promise<void> {
    try {
      const { data, error } = await supabase
        .rpc('end_stream_comprehensive', {
          p_force_end_all: true
        });
      
      if (error) {
        console.error('Error force ending all streams:', error);
        throw new Error(error.message);
      }
      
      console.log('Force end all streams result:', data);
    } catch (error) {
      console.error('Error in forceEndAllStreams:', error);
      throw error;
    }
  }

  // Get stream status
  async getStreamStatus(streamId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('get_stream_status', {
          p_stream_id: streamId
        });
      
      if (error) {
        console.error('Error getting stream status:', error);
        throw new Error(error.message);
      }
      
      return data;
    } catch (error) {
      console.error('Error in getStreamStatus:', error);
      throw error;
    }
  }

  // List all active streams
  async listActiveStreams(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('list_active_streams');
      
      if (error) {
        console.error('Error listing active streams:', error);
        throw new Error(error.message);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in listActiveStreams:', error);
      throw error;
    }
  }

  // Auto-end inactive streams
  async autoEndInactiveStreams(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('auto_end_inactive_streams');
      
      if (error) {
        console.error('Error auto-ending inactive streams:', error);
        throw new Error(error.message);
      }
      
      console.log(`Auto-ended ${data} inactive streams`);
      return data || 0;
    } catch (error) {
      console.error('Error in autoEndInactiveStreams:', error);
      throw error;
    }
  }

  // Get weekly streaming usage for a user from the weekly_usage table
  async getWeeklyUsage(userId: string): Promise<{ totalMinutes: number; totalHours: number }> {
    // Get the start of the current week (Monday)
    const now = new Date();
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
    startOfWeek.setDate(now.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);

    console.log('Weekly usage calculation:', {
      userId,
      startOfWeek: startOfWeek.toISOString(),
      now: now.toISOString(),
      dayOfWeek
    });

    // First try to get from weekly_usage table
    const { data: weeklyData, error: weeklyError } = await supabase
      .from('weekly_usage')
      .select('streamed_minutes')
      .eq('user_id', userId)
      .eq('week_start_date', startOfWeek.toISOString().split('T')[0])
      .single();

    if (weeklyError && weeklyError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching weekly usage:', weeklyError);
      throw new Error(weeklyError.message);
    }

    let totalMinutes = 0;
    if (weeklyData) {
      totalMinutes = weeklyData.streamed_minutes || 0;
      console.log('Found weekly usage record:', weeklyData);
    } else {
      console.log('No weekly usage record found, falling back to livestreams calculation');
      
      // Fallback to calculating from livestreams table
    const { data, error } = await supabase
      .from('livestreams')
      .select('started_at, ended_at, title')
      .eq('streamer_id', userId)
      .eq('status', 'ended')
      .not('started_at', 'is', null)
      .not('ended_at', 'is', null)
      .gte('started_at', startOfWeek.toISOString())
      .lte('started_at', now.toISOString());

    if (error) throw new Error(error.message);

    // Calculate total minutes from all streams
    if (data && data.length > 0) {
      console.log(`Found ${data.length} completed streams this week:`, data);
      
      totalMinutes = data.reduce((total, stream) => {
        const startTime = new Date(stream.started_at);
        const endTime = new Date(stream.ended_at);
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        
        console.log(`Stream "${stream.title}": ${durationMinutes} minutes`);
        
        return total + durationMinutes;
      }, 0);
    } else {
      console.log('No completed streams found for this week');
      }
    }

    const totalHours = totalMinutes / 60;
    
    console.log('Weekly usage summary:', {
      totalMinutes,
      totalHours: totalHours.toFixed(2)
    });
    
    return { totalMinutes, totalHours };
  }

  // Get days remaining in current week
  getDaysRemainingInWeek(): number {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysRemaining = dayOfWeek === 0 ? 0 : 7 - dayOfWeek; // Sunday = 0, Monday = 1
    return daysRemaining;
  }

  // Get user's verified profile with subscription plan details
  async getUserProfile(userId: string): Promise<any> {
    console.log('Getting user profile for userId:', userId);
    
    // First try to get profile with subscription plan details
    let { data, error } = await supabase
      .from('verified_profiles')
      .select(`
        *,
        subscription_plans (
          name,
          streaming_minutes_limit,
          price_usd,
          features
        )
      `)
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile with subscription plan:', error);
      
      // If the join fails, try to get just the profile without subscription plan details
      console.log('Trying to fetch profile without subscription plan join...');
      const { data: profileData, error: profileError } = await supabase
        .from('verified_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw new Error(profileError.message);
      }
      
      console.log('User profile data returned (without subscription plan):', profileData);
      return profileData;
    }
    
    console.log('User profile data returned:', data);
    console.log('Subscription plan from database:', data?.subscription_plan);
    console.log('Subscription plan ID:', data?.subscription_plan_id);
    console.log('Subscription plan details:', data?.subscription_plans);
    console.log('Streaming minutes limit:', data?.subscription_plans?.streaming_minutes_limit);
    
    return data;
  }

  // Get weekly limit from plan
  getWeeklyLimitFromPlan(subscriptionPlan?: string, streamingMinutesLimit?: number): number {
    if (streamingMinutesLimit) {
      return streamingMinutesLimit;
    }
    
    // Default limits based on plan names
    switch (subscriptionPlan?.toLowerCase()) {
      case 'olive':
      case 'basic':
        return 60; // 1 hour per week
      case 'cedar':
      case 'premium':
        return 0; // Unlimited
      case 'cypress':
      case 'standard':
        return 180; // 3 hours per week
      default:
        return 60; // Default to 1 hour
    }
  }

  // Check if user has reached their weekly streaming limit
  async checkWeeklyStreamingLimit(userId: string): Promise<{
    hasReachedLimit: boolean;
    currentMinutes: number;
    limitMinutes: number;
    remainingMinutes: number;
    usagePercentage: number;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('check_weekly_streaming_limit', { user_id_param: userId })
        .single();

      if (error) {
        console.error('Error checking weekly streaming limit:', error);
        throw new Error(error.message);
      }

      // Type the response data
      const responseData = data as {
        has_reached_limit: boolean;
        current_minutes: number;
        limit_minutes: number;
        remaining_minutes: number;
        usage_percentage: number;
      };

      return {
        hasReachedLimit: responseData.has_reached_limit,
        currentMinutes: responseData.current_minutes,
        limitMinutes: responseData.limit_minutes,
        remainingMinutes: responseData.remaining_minutes,
        usagePercentage: responseData.usage_percentage
      };
    } catch (error) {
      console.error('Error checking weekly streaming limit:', error);
      // Return default values if function doesn't exist
      return {
        hasReachedLimit: false,
        currentMinutes: 0,
        limitMinutes: 0,
        remainingMinutes: 0,
        usagePercentage: 0
      };
    }
  }

  // Update user's email preferences
  async updateEmailPreferences(userId: string, preferences: {
    streamingLimitEmails?: boolean;
  }): Promise<void> {
    try {
      // Get current preferences
      const { data: currentProfile, error: fetchError } = await supabase
        .from('verified_profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Merge with existing preferences
      const currentPreferences = currentProfile?.preferences || {};
      const updatedPreferences = {
        ...currentPreferences,
        ...preferences
      };

      // Update preferences
      const { error: updateError } = await supabase
        .from('verified_profiles')
        .update({ preferences: updatedPreferences })
        .eq('id', userId);

      if (updateError) {
        throw new Error(updateError.message);
      }
    } catch (error) {
      console.error('Error updating email preferences:', error);
      throw error;
    }
  }

  // Get user's email preferences
  async getEmailPreferences(userId: string): Promise<{
    streamingLimitEmails: boolean;
  }> {
    try {
      const { data, error } = await supabase
        .from('verified_profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const preferences = data?.preferences || {};
      return {
        streamingLimitEmails: preferences.streamingLimitEmails !== false // Default to true
      };
    } catch (error) {
      console.error('Error getting email preferences:', error);
      // Return default preferences
      return {
        streamingLimitEmails: true
      };
    }
  }

  // Send streaming limit emails
  async sendStreamingLimitEmails(userId: string): Promise<{
    warningSent: boolean;
    reachedSent: boolean;
  }> {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('verified_profiles')
        .select('email, first_name, preferences')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw new Error(profileError.message);
      }

      // Check email preferences
      const preferences = profile?.preferences || {};
      const shouldSendEmails = preferences.streamingLimitEmails !== false;

      if (!shouldSendEmails) {
        return { warningSent: false, reachedSent: false };
      }

      // Get current streaming limits
      const limitData = await this.checkWeeklyStreamingLimit(userId);
      
      // Calculate reset date (next Monday)
      const now = new Date();
      const daysUntilMonday = (8 - now.getDay()) % 7;
      const resetDate = new Date(now);
      resetDate.setDate(now.getDate() + daysUntilMonday);
      resetDate.setHours(0, 0, 0, 0);

      const resetDateString = resetDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      let warningSent = false;
      let reachedSent = false;

      // Send warning email at 75% threshold
      if (limitData.usagePercentage >= 75 && limitData.usagePercentage < 100) {
        warningSent = await emailService.sendWeeklyStreamingLimitWarning(
          profile.email,
          profile.first_name || 'User',
          resetDateString,
          limitData.remainingMinutes,
          limitData.limitMinutes
        );
      }

      // Send limit reached email at 100% threshold
      if (limitData.usagePercentage >= 100) {
        reachedSent = await emailService.sendWeeklyStreamingLimitReached(
          profile.email,
          profile.first_name || 'User',
          resetDateString
        );
      }

      return { warningSent, reachedSent };
    } catch (error) {
      console.error('Error sending streaming limit emails:', error);
      return { warningSent: false, reachedSent: false };
    }
  }
}

export const databaseService = new DatabaseService();
export default databaseService; 