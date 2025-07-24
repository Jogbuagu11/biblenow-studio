import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  text: string;
  user: string;
  timestamp: Date;
  profilePic?: string;
  roomId: string;
  userId?: string;
  isSystemMessage?: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  isActive: boolean;
  messageCount: number;
  lastMessage?: ChatMessage;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatState {
  // State
  messages: ChatMessage[];
  currentRoomId: string | null;
  rooms: ChatRoom[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  typingUsers: string[];
  
  // Actions
  setMessages: (messages: ChatMessage[]) => void;
  setCurrentRoomId: (roomId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConnected: (connected: boolean) => void;
  clearError: () => void;
  
  // Message actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (messageId: string) => void;
  clearMessages: (roomId?: string) => void;
  
  // Room actions
  setRooms: (rooms: ChatRoom[]) => void;
  addRoom: (room: Omit<ChatRoom, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRoom: (roomId: string, updates: Partial<ChatRoom>) => void;
  removeRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string) => void;
  
  // Typing indicators
  addTypingUser: (userId: string) => void;
  removeTypingUser: (userId: string) => void;
  clearTypingUsers: () => void;
  
  // Chat operations
  sendMessage: (text: string, roomId: string, user: string, profilePic?: string) => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  fetchMessages: (roomId: string, limit?: number) => Promise<void>;
  fetchRooms: () => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: [],
      currentRoomId: null,
      rooms: [],
      isLoading: false,
      error: null,
      isConnected: false,
      typingUsers: [],

      // Basic actions
      setMessages: (messages) => set({ messages }),
      setCurrentRoomId: (currentRoomId) => set({ currentRoomId }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setConnected: (isConnected) => set({ isConnected }),
      clearError: () => set({ error: null }),

      // Message actions
      addMessage: (messageData) => {
        const newMessage: ChatMessage = {
          ...messageData,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
        };

        const { messages } = get();
        const updatedMessages = [...messages, newMessage];
        
        set({ messages: updatedMessages });

        // Update room's last message
        const { rooms } = get();
        const updatedRooms = rooms.map(room => 
          room.id === messageData.roomId 
            ? { 
                ...room, 
                lastMessage: newMessage,
                messageCount: room.messageCount + 1,
                updatedAt: new Date()
              }
            : room
        );
        set({ rooms: updatedRooms });
      },

      updateMessage: (messageId, updates) => {
        const { messages } = get();
        const updatedMessages = messages.map(message => 
          message.id === messageId 
            ? { ...message, ...updates }
            : message
        );
        set({ messages: updatedMessages });
      },

      deleteMessage: (messageId) => {
        const { messages } = get();
        const updatedMessages = messages.filter(message => message.id !== messageId);
        set({ messages: updatedMessages });
      },

      clearMessages: (roomId) => {
        const { messages } = get();
        const updatedMessages = roomId 
          ? messages.filter(message => message.roomId !== roomId)
          : [];
        set({ messages: updatedMessages });
      },

      // Room actions
      setRooms: (rooms) => set({ rooms }),
      
      addRoom: (roomData) => {
        const newRoom: ChatRoom = {
          ...roomData,
          id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const { rooms } = get();
        const updatedRooms = [...rooms, newRoom];
        set({ rooms: updatedRooms });
      },

      updateRoom: (roomId, updates) => {
        const { rooms } = get();
        const updatedRooms = rooms.map(room => 
          room.id === roomId 
            ? { ...room, ...updates, updatedAt: new Date() }
            : room
        );
        set({ rooms: updatedRooms });
      },

      removeRoom: (roomId) => {
        const { rooms, currentRoomId } = get();
        const updatedRooms = rooms.filter(room => room.id !== roomId);
        const newCurrentRoomId = currentRoomId === roomId ? null : currentRoomId;
        
        set({ 
          rooms: updatedRooms,
          currentRoomId: newCurrentRoomId
        });
      },

      setActiveRoom: (roomId) => {
        const { rooms } = get();
        const updatedRooms = rooms.map(room => ({
          ...room,
          isActive: room.id === roomId
        }));
        
        set({ 
          rooms: updatedRooms,
          currentRoomId: roomId
        });
      },

      // Typing indicators
      addTypingUser: (userId) => {
        const { typingUsers } = get();
        if (!typingUsers.includes(userId)) {
          set({ typingUsers: [...typingUsers, userId] });
        }
      },

      removeTypingUser: (userId) => {
        const { typingUsers } = get();
        set({ typingUsers: typingUsers.filter(id => id !== userId) });
      },

      clearTypingUsers: () => set({ typingUsers: [] }),

      // Chat operations
      sendMessage: async (text, roomId, user, profilePic) => {
        const { addMessage } = get();
        
        try {
          // TODO: Implement Firebase Firestore message sending
          // await chatService.sendMessage({ text, user, profilePic, roomId });
          
          // Add message to local state
          addMessage({
            text,
            user,
            profilePic,
            roomId,
            userId: user, // You can get this from auth store
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to send message' 
          });
        }
      },

      joinRoom: async (roomId) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Implement Firebase Firestore room joining
          // await chatService.joinRoom(roomId);
          
          const { setActiveRoom } = get();
          setActiveRoom(roomId);
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to join room',
            isLoading: false 
          });
        }
      },

      leaveRoom: async (roomId) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Implement Firebase Firestore room leaving
          // await chatService.leaveRoom(roomId);
          
          const { removeRoom } = get();
          removeRoom(roomId);
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to leave room',
            isLoading: false 
          });
        }
      },

      fetchMessages: async (roomId, limit = 50) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Implement Firebase Firestore message fetching
          // const messages = await chatService.fetchMessages(roomId, limit);
          
          // Mock data for now
          const mockMessages: ChatMessage[] = [];
          set({ messages: mockMessages, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch messages',
            isLoading: false 
          });
        }
      },

      fetchRooms: async () => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Implement Firebase Firestore room fetching
          // const rooms = await chatService.fetchRooms();
          
          // Mock data for now
          const mockRooms: ChatRoom[] = [];
          set({ rooms: mockRooms, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch rooms',
            isLoading: false 
          });
        }
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({ 
        rooms: state.rooms,
        currentRoomId: state.currentRoomId
      }),
    }
  )
); 