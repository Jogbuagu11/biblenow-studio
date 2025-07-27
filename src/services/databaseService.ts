import { dbConfig } from '../config/firebase';
import { StreamInfo } from '../stores/livestreamStore';
import { supabase } from '../config/supabase';

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
    // Ensure streamer_id is set from the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const scheduledStreamWithUser = {
      ...livestreamData,
      streamer_id: user.id, // Ensure streamer_id is set to the authenticated user's ID
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
    
    // Ensure streamer_id is set from the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const livestreamWithUser = {
      ...livestreamData,
      streamer_id: user.id, // Ensure streamer_id is set to the authenticated user's ID
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
      .order('created_at', { ascending: false })
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
    
    // First, find the active stream
    const { data: activeStreams, error: findError } = await supabase
      .from('livestreams')
      .select('id, title')
      .eq('streamer_id', userId)
      .eq('is_live', true);
    
    if (findError) {
      console.error('Error finding active streams:', findError);
      throw new Error(findError.message);
    }
    
    if (!activeStreams || activeStreams.length === 0) {
      console.log('No active streams found for user:', userId);
      return;
    }
    
    console.log('Found active streams:', activeStreams);
    
    // End each active stream
    for (const stream of activeStreams) {
      const { error } = await supabase
        .from('livestreams')
        .update({
          is_live: false,
          ended_at: new Date().toISOString(),
          status: 'ended',
          updated_at: new Date().toISOString()
        })
        .eq('id', stream.id);
      
      if (error) {
        console.error('Error ending stream:', stream.id, error);
        throw new Error(error.message);
      }
      
      console.log('Successfully ended stream:', stream.id, stream.title);
    }
  }

  // End stream by ID (for manual ending)
  async endStreamById(streamId: string): Promise<void> {
    const { error } = await supabase
      .from('livestreams')
      .update({
        is_live: false,
        ended_at: new Date().toISOString(),
        status: 'ended',
        updated_at: new Date().toISOString()
      })
      .eq('id', streamId)
      .eq('is_live', true);
    if (error) throw new Error(error.message);
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

  // Get weekly limit based on subscription plan (returns minutes for accuracy)
  getWeeklyLimitFromPlan(subscriptionPlan?: string, streamingMinutesLimit?: number): number {
    console.log('getWeeklyLimitFromPlan called with:', subscriptionPlan);
    console.log('Streaming minutes limit:', streamingMinutesLimit);
    
    // If subscription plan is empty/null, return 0 minutes
    if (!subscriptionPlan || subscriptionPlan.trim() === '') {
      console.log('No subscription plan found, returning 0 minutes');
      return 0;
    }
    
    // If we have the actual streaming minutes limit from the database, use that
    if (streamingMinutesLimit && streamingMinutesLimit > 0) {
      console.log('Using streaming minutes limit from database:', streamingMinutesLimit, 'minutes');
      return streamingMinutesLimit;
    }
    
    // Also check if streamingMinutesLimit is 0 (which means no limit set)
    if (streamingMinutesLimit === 0) {
      console.log('Streaming minutes limit is 0, returning 0 minutes');
      return 0;
    }
    
    // Fallback to plan name mapping if no minutes limit provided
    const plan = subscriptionPlan?.toLowerCase();
    console.log('Normalized plan:', plan);
    
    let limitMinutes: number;
    switch (plan) {
      case 'basic':
        limitMinutes = 180; // 180 minutes per week
        break;
      case 'standard':
        limitMinutes = 360; // 360 minutes per week
        break;
      case 'premium':
        limitMinutes = 900; // 900 minutes per week
        break;
      case 'olive':
        limitMinutes = 180; // 180 minutes per week
        break;
      case 'branch':
        limitMinutes = 360; // 360 minutes per week
        break;
      case 'vine':
        limitMinutes = 900; // 900 minutes per week
        break;
      case 'cedar':
        limitMinutes = 1200; // 1200 minutes per week
        break;
      default:
        limitMinutes = 0; // No valid plan found, return 0 minutes
        console.log('No valid plan found, returning 0 minutes');
        break;
    }
    
    console.log('Returning weekly limit:', limitMinutes, 'minutes');
    return limitMinutes;
  }
}

export const databaseService = new DatabaseService();
export default databaseService; 