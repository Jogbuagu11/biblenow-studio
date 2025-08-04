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
        .select('id, title, is_live, status, started_at')
        .eq('streamer_id', userId)
        .or('is_live.eq.true,status.eq.active');
      
      if (checkError) {
        console.error('Error checking active streams:', checkError);
        throw new Error(checkError.message);
      }
      
      console.log('Active streams found for user:', activeStreams);
      
      if (!activeStreams || activeStreams.length === 0) {
        console.log('No active streams found for user:', userId);
        return;
      }
      
      // End each active stream directly using direct update
      for (const stream of activeStreams) {
        console.log(`Ending stream: ${stream.id} - ${stream.title}`);
        
        const { data, error } = await supabase
          .from('livestreams')
          .update({
            is_live: false,
            ended_at: new Date().toISOString(),
            status: 'ended',
            updated_at: new Date().toISOString()
          })
          .eq('id', stream.id)
          .select();
        
        if (error) {
          console.error(`Error ending stream ${stream.id}:`, error);
          throw new Error(error.message);
        }
        
        console.log(`Successfully ended stream: ${stream.id}`, data);
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
        if (verifyStreams && verifyStreams.length === 0) {
          console.log('All streams successfully ended');
        } else {
          console.log('Some streams may still be active:', verifyStreams);
        }
      }
      
    } catch (error) {
      console.error('Error in endStreamOnRedirect:', error);
      throw error;
    }
  }

  // End stream by ID (for manual ending)
  async endStreamById(streamId: string): Promise<void> {
    try {
      console.log(`Ending stream by ID: ${streamId}`);
      
      const { data, error } = await supabase
        .from('livestreams')
        .update({
          is_live: false,
          ended_at: new Date().toISOString(),
          status: 'ended',
          updated_at: new Date().toISOString()
        })
        .eq('id', streamId)
        .select();
      
      if (error) {
        console.error('Error ending stream by ID:', error);
        throw new Error(error.message);
      }
      
      console.log('End stream by ID result:', data);
      
      if (!data || data.length === 0) {
        throw new Error('Stream not found or already ended');
      }
    } catch (error) {
      console.error('Error in endStreamById:', error);
      throw error;
    }
  }

  // Force end all active streams (admin function)
  async forceEndAllStreams(): Promise<void> {
    try {
      console.log('Force ending all active streams');
      
      const { data, error } = await supabase
        .from('livestreams')
        .update({
          is_live: false,
          ended_at: new Date().toISOString(),
          status: 'ended',
          updated_at: new Date().toISOString()
        })
        .or('is_live.eq.true,status.eq.active')
        .select();
      
      if (error) {
        console.error('Error force ending all streams:', error);
        throw new Error(error.message);
      }
      
      console.log('Force end all streams result:', data);
      console.log(`Ended ${data?.length || 0} streams`);
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

  // Get followers for a verified user
  async getFollowers(userId: string): Promise<any[]> {
    try {
      console.log('Fetching followers for user:', userId);
      
      // First get the follower IDs
      const { data: followsData, error: followsError } = await supabase
        .from('user_follows')
        .select('follower_id, following_id, created_at')
        .eq('following_id', userId)
        .order('created_at', { ascending: false });

      if (followsError) {
        console.error('Error fetching follows data:', followsError);
        throw new Error(followsError.message);
      }

      if (!followsData || followsData.length === 0) {
        return [];
      }

      // Get the follower profile details
      const followerIds = followsData.map(follow => follow.follower_id);
      console.log('Follower IDs to lookup:', followerIds);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, profile_photo_url')
        .in('id', followerIds);

      if (profilesError) {
        console.error('Error fetching follower profiles:', profilesError);
        throw new Error(profilesError.message);
      }
      
      console.log('Profile data found:', profilesData);

      // Combine the data
      const followers = followsData.map(follow => {
        const profile = profilesData?.find(p => p.id === follow.follower_id);
        return {
          ...follow,
          followers: profile
        };
      });

      console.log('Followers data:', followers);
      return followers;
    } catch (error) {
      console.error('Error in getFollowers:', error);
      return [];
    }
  }

  // Get users that a verified user is following
  async getFollowing(userId: string): Promise<any[]> {
    try {
      console.log('Fetching following for user:', userId);
      
      // First get the followed IDs
      const { data: followsData, error: followsError } = await supabase
        .from('user_follows')
        .select('follower_id, following_id, created_at')
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });

      if (followsError) {
        console.error('Error fetching follows data:', followsError);
        throw new Error(followsError.message);
      }

      if (!followsData || followsData.length === 0) {
        return [];
      }

      // Get the followed profile details
      const followedIds = followsData.map(follow => follow.following_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, profile_photo_url')
        .in('id', followedIds);

      if (profilesError) {
        console.error('Error fetching followed profiles:', profilesError);
        throw new Error(profilesError.message);
      }

      // Combine the data
      const following = followsData.map(follow => {
        const profile = profilesData?.find(p => p.id === follow.following_id);
        return {
          ...follow,
          following: profile
        };
      });

      console.log('Following data:', following);
      return following;
    } catch (error) {
      console.error('Error in getFollowing:', error);
      return [];
    }
  }

  // Get verified followers for a user (from verified_profiles table)
  async getVerifiedFollowers(userId: string): Promise<any[]> {
    try {
      console.log('Fetching verified followers for user:', userId);
      
      // First get the follower IDs from user_follows
      const { data: followsData, error: followsError } = await supabase
        .from('user_follows')
        .select('follower_id, following_id, created_at')
        .eq('following_id', userId)
        .order('created_at', { ascending: false });

      if (followsError) {
        console.error('Error fetching follows data:', followsError);
        throw new Error(followsError.message);
      }

      if (!followsData || followsData.length === 0) {
        return [];
      }

      // Get the follower profile details from verified_profiles
      const followerIds = followsData.map(follow => follow.follower_id);
      const { data: verifiedProfilesData, error: verifiedProfilesError } = await supabase
        .from('verified_profiles')
        .select('id, first_name, last_name, email, profile_photo_url, ministry_name')
        .in('id', followerIds);

      if (verifiedProfilesError) {
        console.error('Error fetching verified follower profiles:', verifiedProfilesError);
        throw new Error(verifiedProfilesError.message);
      }

      // Combine the data
      const verifiedFollowers = followsData.map(follow => {
        const profile = verifiedProfilesData?.find(p => p.id === follow.follower_id);
        return {
          ...follow,
          verified_followers: profile
        };
      });

      console.log('Verified followers data:', verifiedFollowers);
      return verifiedFollowers;
    } catch (error) {
      console.error('Error in getVerifiedFollowers:', error);
      return [];
    }
  }

  // Shield a user (add to shielded users list and remove follow relationship)
  async shieldUser(userId: string, shieldedUserId: string): Promise<void> {
    try {
      console.log(`Shielding user ${shieldedUserId} for user ${userId}`);
      
      // Call the edge function to handle the transaction
      const { data, error } = await supabase.functions.invoke('shield-user', {
        body: { shieldedUserId, userId }
      });

      if (error) {
        console.error('Error shielding user:', error);
        throw new Error(error.message);
      }

      console.log('User shielded successfully:', data);
    } catch (error) {
      console.error('Error in shieldUser:', error);
      throw error;
    }
  }

  // Unshield a user (remove from shielded users list)
  async unshieldUser(userId: string, shieldedUserId: string): Promise<void> {
    try {
      console.log(`Unshielding user ${shieldedUserId} for user ${userId}`);
      
      // Call the edge function to handle unshielding
      const { data, error } = await supabase.functions.invoke('unshield-user', {
        body: { shieldedUserId, userId }
      });

      if (error) {
        console.error('Error unshielding user:', error);
        throw new Error(error.message);
      }

      console.log('User unshielded successfully:', data);
    } catch (error) {
      console.error('Error in unshieldUser:', error);
      throw error;
    }
  }

  // Get shielded users for a user
  async getShieldedUsers(userId: string): Promise<any[]> {
    try {
      console.log('Fetching shielded users for user:', userId);
      
      // Get shielded user IDs
      const { data: shieldsData, error: shieldsError } = await supabase
        .from('user_shields')
        .select('shielded_user_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (shieldsError) {
        console.error('Error fetching shields data:', shieldsError);
        throw new Error(shieldsError.message);
      }

      console.log('Raw shields data:', shieldsData);

      if (!shieldsData || shieldsData.length === 0) {
        console.log('No shielded users found');
        return [];
      }

      // Get the shielded user profile details
      const shieldedIds = shieldsData.map(shield => shield.shielded_user_id);
      console.log('Shielded user IDs:', shieldedIds);
      
      // Get profiles from verified_profiles (since followers are verified users)
      const { data: verifiedProfilesData, error: verifiedProfilesError } = await supabase
        .from('verified_profiles')
        .select('id, first_name, last_name, email, profile_photo_url, ministry_name')
        .in('id', shieldedIds);

      if (verifiedProfilesError) {
        console.error('Error fetching verified shielded profiles:', verifiedProfilesError);
        throw new Error(verifiedProfilesError.message);
      }

      console.log('Verified profile data for shielded users:', verifiedProfilesData);

      // Combine the data
      const shieldedUsers = shieldsData.map(shield => {
        const profile = verifiedProfilesData?.find(p => p.id === shield.shielded_user_id);
        return {
          ...shield,
          shielded_user: profile
        };
      });

      console.log('Final shielded users data:', shieldedUsers);
      return shieldedUsers;
    } catch (error) {
      console.error('Error in getShieldedUsers:', error);
      return [];
    }
  }

  // Check if a user is shielded by another user
  async isUserShielded(userId: string, shieldedUserId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_shields')
        .select('id')
        .eq('user_id', userId)
        .eq('shielded_user_id', shieldedUserId)
        .maybeSingle();

      if (error) {
        console.error('Error checking if user is shielded:', error);
        throw new Error(error.message);
      }

      return !!data;
    } catch (error) {
      console.error('Error in isUserShielded:', error);
      return false;
    }
  }

  // Get invite history for a user
  async getInviteHistory(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('user_invites')
        .select(`
          id,
          inviter_id,
          invitee_email,
          sent_at,
          accepted,
          accepted_at,
          message,
          status,
          resent_at
        `)
        .eq('inviter_id', userId)
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error fetching invite history:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getInviteHistory:', error);
      return [];
    }
  }

  // Send an invite
  async sendInvite(userId: string, inviteeEmail: string, message: string = 'You have been invited to join BibleNOW!'): Promise<any> {
    try {
      console.log('Sending invite from user:', userId, 'to:', inviteeEmail);
      
      const { data, error } = await supabase
        .from('user_invites')
        .insert([{
          inviter_id: userId,
          invitee_email: inviteeEmail,
          message: message,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        console.error('Error sending invite:', error);
        throw new Error(error.message);
      }

      console.log('Invite sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in sendInvite:', error);
      throw error;
    }
  }

  // Resend an invite
  async resendInvite(inviteId: string): Promise<any> {
    try {
      console.log('Resending invite:', inviteId);
      
      const { data, error } = await supabase
        .from('user_invites')
        .update({
          resent_at: new Date().toISOString(),
          status: 'pending'
        })
        .eq('id', inviteId)
        .select()
        .single();

      if (error) {
        console.error('Error resending invite:', error);
        throw new Error(error.message);
      }

      console.log('Invite resent successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in resendInvite:', error);
      throw error;
    }
  }

  // Cancel an invite
  async cancelInvite(inviteId: string): Promise<any> {
    try {
      console.log('Cancelling invite:', inviteId);
      
      const { data, error } = await supabase
        .from('user_invites')
        .update({
          status: 'cancelled'
        })
        .eq('id', inviteId)
        .select()
        .single();

      if (error) {
        console.error('Error cancelling invite:', error);
        throw new Error(error.message);
      }

      console.log('Invite cancelled successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in cancelInvite:', error);
      throw error;
    }
  }

  // Get total view count for all livestreams by a user
  async getTotalViewCount(userId: string): Promise<number> {
    try {
      console.log('Fetching total view count for user:', userId);
      
      const { data, error } = await supabase
        .from('livestreams')
        .select('viewer_count')
        .eq('streamer_id', userId);

      if (error) {
        console.error('Error fetching total view count:', error);
        throw new Error(error.message);
      }

      const totalViews = data?.reduce((sum, stream) => sum + (stream.viewer_count || 0), 0) || 0;
      console.log('Total view count for user:', userId, '=', totalViews);
      
      return totalViews;
    } catch (error) {
      console.error('Error in getTotalViewCount:', error);
      return 0;
    }
  }

  // Get total follower count for a user
  async getTotalFollowerCount(userId: string): Promise<number> {
    try {
      console.log('Fetching total follower count for user:', userId);
      
      const { data, error } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', userId);

      if (error) {
        console.error('Error fetching total follower count:', error);
        throw new Error(error.message);
      }

      const totalFollowers = data?.length || 0;
      console.log('Total follower count for user:', userId, '=', totalFollowers);
      
      return totalFollowers;
    } catch (error) {
      console.error('Error in getTotalFollowerCount:', error);
      return 0;
    }
  }

  // Get top performing streams for a user
  async getTopPerformingStreams(userId: string, limit: number = 5): Promise<any[]> {
    try {
      console.log('Fetching top performing streams for user:', userId);
      
      const { data, error } = await supabase
        .from('livestreams')
        .select('id, title, viewer_count, started_at, ended_at, description')
        .eq('streamer_id', userId)
        .order('viewer_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching top performing streams:', error);
        throw new Error(error.message);
      }

      // Filter out streams with 0 viewers and format the data
      const topStreams = data
        ?.filter(stream => stream.viewer_count > 0)
        .map((stream, index) => ({
          ...stream,
          rank: index + 1,
          // Calculate duration if stream has ended
          duration: stream.ended_at && stream.started_at 
            ? Math.round((new Date(stream.ended_at).getTime() - new Date(stream.started_at).getTime()) / 60000) // minutes
            : null
        })) || [];

      console.log('Top performing streams for user:', userId, '=', topStreams);
      
      return topStreams;
    } catch (error) {
      console.error('Error in getTopPerformingStreams:', error);
      return [];
    }
  }

  // Get average watch time for a user's streams
  async getAverageWatchTime(userId: string): Promise<{ averageMinutes: number; averageHours: number; formattedTime: string }> {
    try {
      console.log('Fetching average watch time for user:', userId);
      
      const { data, error } = await supabase
        .from('livestreams')
        .select('started_at, ended_at')
        .eq('streamer_id', userId)
        .not('started_at', 'is', null)
        .not('ended_at', 'is', null);

      if (error) {
        console.error('Error fetching streams for average watch time:', error);
        throw new Error(error.message);
      }

      // Calculate durations for completed streams
      const completedStreams = data?.filter(stream => 
        stream.started_at && stream.ended_at
      ) || [];

      if (completedStreams.length === 0) {
        console.log('No completed streams found for average watch time calculation');
        return { averageMinutes: 0, averageHours: 0, formattedTime: '0m 0s' };
      }

      const totalMinutes = completedStreams.reduce((total, stream) => {
        const startTime = new Date(stream.started_at).getTime();
        const endTime = new Date(stream.ended_at).getTime();
        const durationMinutes = Math.round((endTime - startTime) / 60000);
        return total + durationMinutes;
      }, 0);

      const averageMinutes = Math.round(totalMinutes / completedStreams.length);
      const averageHours = Math.floor(averageMinutes / 60);
      const remainingMinutes = averageMinutes % 60;

      const formattedTime = averageHours > 0 
        ? `${averageHours}h ${remainingMinutes}m`
        : `${remainingMinutes}m`;

      console.log('Average watch time for user:', userId, '=', { averageMinutes, averageHours, formattedTime });
      
      return { averageMinutes, averageHours, formattedTime };
    } catch (error) {
      console.error('Error in getAverageWatchTime:', error);
      return { averageMinutes: 0, averageHours: 0, formattedTime: '0m 0s' };
    }
  }
}

export const databaseService = new DatabaseService();
export default databaseService; 