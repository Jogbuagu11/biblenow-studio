import { dbConfig } from '../config/firebase';

export interface ChatMessage {
  id: string;
  text: string;
  user: string;
  timestamp: Date;
  profilePic?: string;
  roomId: string;
}

class ChatService {
  private apiUrl: string;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.apiUrl = dbConfig.apiUrl;
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

  // Subscribe to chat messages for a specific room (using polling)
  subscribeToMessages(roomId: string, callback: (messages: ChatMessage[]) => void) {
    // Clear any existing polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Initial call
    this.fetchMessages(roomId, callback);

    // Set up polling every 3 seconds
    this.pollingInterval = setInterval(() => {
      this.fetchMessages(roomId, callback);
    }, 3000);
  }

  // Fetch messages from API
  private async fetchMessages(roomId: string, callback: (messages: ChatMessage[]) => void) {
    try {
      const messages = await this.apiCall(`/chat/${roomId}/messages`);
      // Sort by timestamp (oldest first for display)
      messages.sort((a: ChatMessage, b: ChatMessage) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      callback(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      callback([]);
    }
  }

  // Send a new message
  async sendMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>) {
    try {
      await this.apiCall(`/chat/${message.roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          text: message.text,
          user: message.user,
          profilePic: message.profilePic,
          timestamp: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Unsubscribe from chat messages
  unsubscribeFromMessages() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Get user display name (you can extend this for authentication)
  getUserDisplayName(): string {
    // For now, return a random name or use localStorage
    const savedName = localStorage.getItem('chat_user_name');
    if (savedName) {
      return savedName;
    }
    
    const randomNames = ['Anonymous', 'Guest', 'Viewer', 'Listener'];
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    localStorage.setItem('chat_user_name', randomName);
    return randomName;
  }

  // Get user profile picture (you can extend this for authentication)
  getUserProfilePic(): string {
    const savedPic = localStorage.getItem('chat_user_pic');
    if (savedPic) {
      return savedPic;
    }
    
    // Generate a random color for the profile picture
    const colors = ['#8B4513', '#2E8B57', '#4682B4', '#CD853F', '#708090'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const userInitial = this.getUserDisplayName().charAt(0);
    
    const profilePic = `https://via.placeholder.com/40/${randomColor.replace('#', '')}/FFFFFF?text=${userInitial}`;
    localStorage.setItem('chat_user_pic', profilePic);
    return profilePic;
  }
}

export const chatService = new ChatService();
export default chatService; 