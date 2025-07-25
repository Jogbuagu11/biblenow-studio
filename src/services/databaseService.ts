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
          created_at: new Date().toISOString(),
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
    const { data, error } = await supabase
      .from('livestreams')
      .insert([{
        ...livestreamData,
        is_live: false,
        started_at: null,
        ended_at: null,
        viewer_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // Create a new livestream (for going live)
  async createLivestream(livestreamData: any) {
    const { data, error } = await supabase
      .from('livestreams')
      .insert([{
        ...livestreamData,
        is_live: true,
        started_at: new Date().toISOString(),
        ended_at: null,
        viewer_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
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
      .order('created_at', { ascending: false });
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
}

export const databaseService = new DatabaseService();
export default databaseService; 