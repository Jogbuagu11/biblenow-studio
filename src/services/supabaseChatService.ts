import { supabase } from '../config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';

export interface ChatMessage {
  id?: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: Date;
  roomId: string;
  isModerator?: boolean;
}

class SupabaseChatService {
  private currentChannel: RealtimeChannel | null = null;
  private unsubscribe: (() => void) | null = null;

  // Subscribe to chat messages for a specific room
  subscribeToMessages(roomId: string, callback: (messages: ChatMessage[]) => void) {
    // Unsubscribe from previous listener if exists
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    if (this.currentChannel) {
      this.currentChannel.unsubscribe();
      this.currentChannel = null;
    }

    // Check if roomId is valid
    if (!roomId || roomId.trim() === '') {
      console.error('Invalid roomId provided to subscribeToMessages:', roomId);
      callback([]);
      return;
    }

    // First, fetch existing messages
    this.fetchMessages(roomId).then((messages) => {
      callback(messages);
    });

    // Then subscribe to real-time updates
    this.currentChannel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'livestream_chat',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          // Fetch updated messages to maintain order
          this.fetchMessages(roomId).then((messages) => {
            callback(messages);
          });
        }
      )
      .subscribe((status) => {
        console.log('Supabase real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to chat messages');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to chat messages');
        }
      });

    // Store unsubscribe function
    this.unsubscribe = () => {
      if (this.currentChannel) {
        this.currentChannel.unsubscribe();
        this.currentChannel = null;
      }
    };
  }

  // Fetch existing messages for a room
  async fetchMessages(roomId: string, limit: number = 100): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('livestream_chat')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      return (data || []).map((msg: any) => ({
        id: msg.id,
        text: msg.text,
        userId: msg.user_id,
        userName: msg.user_name,
        userAvatar: msg.user_avatar,
        timestamp: new Date(msg.created_at),
        roomId: msg.room_id,
        isModerator: msg.is_moderator
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // Send a new message
  async sendMessage(roomId: string, text: string, isModerator: boolean = false): Promise<void> {
    // Get current user from auth store
    const authStore = useSupabaseAuthStore.getState();
    const user = authStore.user;
    
    console.log('Auth store state:', {
      user: user,
      isAuthenticated: authStore.isAuthenticated,
      isLoading: authStore.isLoading,
      error: authStore.error
    });
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (!text.trim()) {
      throw new Error('Message cannot be empty');
    }

    // Check if roomId is valid
    if (!roomId || roomId.trim() === '') {
      throw new Error('Invalid roomId provided to sendMessage');
    }

    try {
      // Get user profile from database (try verified_profiles first, then profiles)
      let userName = user.displayName || user.email || 'BibleNOW User';
      let userAvatar = user.photoURL;

      // Try to get from verified_profiles first
      const { data: verifiedProfile, error: verifiedError } = await supabase
        .from('verified_profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.uid)
        .single();

      if (verifiedProfile && !verifiedError) {
        const firstName = verifiedProfile.first_name || '';
        const lastName = verifiedProfile.last_name || '';
        userName = [firstName, lastName].filter(Boolean).join(' ') || userName;
        userAvatar = verifiedProfile.avatar_url || userAvatar;
      } else {
        // Try to get from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, profile_photo_url')
          .eq('id', user.uid)
          .single();

        if (profile && !profileError) {
          const firstName = profile.first_name || '';
          const lastName = profile.last_name || '';
          userName = [firstName, lastName].filter(Boolean).join(' ') || userName;
          userAvatar = profile.profile_photo_url || userAvatar;
        }
      }

      // Check if user is authenticated through our custom auth store
      const authStore = useSupabaseAuthStore.getState();
      if (!authStore.isAuthenticated || !authStore.user) {
        console.error('User not authenticated through custom auth store');
        throw new Error('User not properly authenticated with Supabase');
      }

      // For now, skip Supabase auth check since users are in verified_profiles but not in Supabase auth
      console.log('Using custom authentication for chat - RLS policies may need adjustment');

      const messageData = {
        room_id: roomId,
        user_id: user.uid,
        user_name: userName,
        user_avatar: userAvatar,
        text: text.trim(),
        is_moderator: isModerator
      };

      console.log('Sending message with data:', messageData);

      const { error } = await supabase
        .from('livestream_chat')
        .insert([messageData]);

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Unsubscribe from messages
  unsubscribeFromMessages() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    
    if (this.currentChannel) {
      this.currentChannel.unsubscribe();
      this.currentChannel = null;
    }
  }

  // Get user display name
  async getUserDisplayName(): Promise<string> {
    const authStore = useSupabaseAuthStore.getState();
    const user = authStore.user;
    return user?.displayName || user?.email || 'Anonymous';
  }

  // Get user avatar
  async getUserAvatar(): Promise<string | undefined> {
    const authStore = useSupabaseAuthStore.getState();
    const user = authStore.user;
    return user?.photoURL;
  }

  // Check if user is moderator (you can implement your own logic here)
  async isModerator(): Promise<boolean> {
    // This could be based on user role, stream ownership, etc.
    // For now, we'll return false and let the calling code determine moderator status
    return false;
  }

  // Clean up resources
  destroy() {
    this.unsubscribeFromMessages();
  }
}

// Export a singleton instance
export const supabaseChatService = new SupabaseChatService(); 