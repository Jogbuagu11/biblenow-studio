import { dbConfig } from '../config/database';

class ViewerService {
  private apiUrl: string;
  private viewerId: string;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.apiUrl = dbConfig.apiUrl;
    // Generate a unique viewer ID for this session
    this.viewerId = `viewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper method for API calls
  private async apiCall(endpoint: string, options: RequestInit = {}) {
    const url = `${this.apiUrl}${endpoint}`;
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
  }

  // Join a stream room
  async joinRoom(roomId: string) {
    try {
      await this.apiCall(`/livestreams/${roomId}/viewers/join`, {
        method: 'POST',
        body: JSON.stringify({
          viewerId: this.viewerId,
          joinedAt: new Date().toISOString()
        }),
      });

      console.log(`Joined room: ${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
    }
  }

  // Leave a stream room
  async leaveRoom(roomId: string) {
    try {
      await this.apiCall(`/livestreams/${roomId}/viewers/leave`, {
        method: 'POST',
        body: JSON.stringify({
          viewerId: this.viewerId,
          leftAt: new Date().toISOString()
        }),
      });

      console.log(`Left room: ${roomId}`);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }

  // Subscribe to viewer count updates (using polling)
  subscribeToViewerCount(roomId: string, callback: (count: number) => void) {
    // Clear any existing polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Initial call
    this.fetchViewerCount(roomId, callback);

    // Set up polling every 5 seconds
    this.pollingInterval = setInterval(() => {
      this.fetchViewerCount(roomId, callback);
    }, 5000);
  }

  // Fetch viewer count from API
  private async fetchViewerCount(roomId: string, callback: (count: number) => void) {
    try {
      const response = await this.apiCall(`/livestreams/${roomId}/viewers/count`);
      const count = response.viewer_count || 0;
      callback(count);
    } catch (error) {
      console.error('Error fetching viewer count:', error);
      callback(0);
    }
  }

  // Unsubscribe from viewer count updates
  unsubscribeFromViewerCount() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Update last seen timestamp (for active viewers)
  async updateLastSeen(roomId: string) {
    try {
      await this.apiCall(`/livestreams/${roomId}/viewers/${this.viewerId}/ping`, {
        method: 'POST',
        body: JSON.stringify({
          lastSeen: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  }

  // Get viewer ID
  getViewerId(): string {
    return this.viewerId;
  }
}

export const viewerService = new ViewerService();
export default viewerService; 