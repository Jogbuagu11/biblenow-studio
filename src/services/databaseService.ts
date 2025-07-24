import { dbConfig } from '../config/firebase';
import { StreamInfo } from '../stores/livestreamStore';

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

  // Create a new livestream
  async createLivestream(streamData: Omit<StreamInfo, 'id' | 'created_at' | 'updated_at' | 'is_live' | 'viewer_count'>): Promise<StreamInfo> {
    return this.apiCall('/livestreams', {
      method: 'POST',
      body: JSON.stringify(streamData),
    });
  }

  // Get all livestreams
  async getLivestreams(): Promise<StreamInfo[]> {
    return this.apiCall('/livestreams');
  }

  // Get livestream by ID
  async getLivestreamById(id: string): Promise<StreamInfo> {
    return this.apiCall(`/livestreams/${id}`);
  }

  // Update livestream
  async updateLivestream(id: string, updates: Partial<StreamInfo>): Promise<StreamInfo> {
    return this.apiCall(`/livestreams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Delete livestream
  async deleteLivestream(id: string): Promise<void> {
    return this.apiCall(`/livestreams/${id}`, {
      method: 'DELETE',
    });
  }

  // Start livestream
  async startLivestream(id: string): Promise<StreamInfo> {
    return this.apiCall(`/livestreams/${id}/start`, {
      method: 'POST',
    });
  }

  // Stop livestream
  async stopLivestream(id: string): Promise<StreamInfo> {
    return this.apiCall(`/livestreams/${id}/stop`, {
      method: 'POST',
    });
  }

  // Get recent livestreams
  async getRecentLivestreams(limit: number = 10): Promise<StreamInfo[]> {
    return this.apiCall(`/livestreams/recent?limit=${limit}`);
  }

  // Get upcoming livestreams
  async getUpcomingLivestreams(): Promise<StreamInfo[]> {
    return this.apiCall('/livestreams/upcoming');
  }

  // Get scheduled livestreams (future streams that are not live)
  async getScheduledLivestreams(): Promise<StreamInfo[]> {
    return this.apiCall('/livestreams/scheduled');
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

  // Get livestreams by type
  async getLivestreamsByType(type: string): Promise<StreamInfo[]> {
    return this.apiCall(`/livestreams/type/${type}`);
  }

  // Get livestreams by platform
  async getLivestreamsByPlatform(platform: string): Promise<StreamInfo[]> {
    return this.apiCall(`/livestreams/platform/${platform}`);
  }
}

export const databaseService = new DatabaseService();
export default databaseService; 