import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { databaseService } from '../services/databaseService';
import { useAuthStore } from './authStore';

export interface StreamInfo {
  id: string; // UUID
  streamer_id?: string; // UUID
  title: string;
  description?: string;
  is_live: boolean;
  started_at?: string; // timestamptz
  ended_at?: string; // timestamptz
  created_at: string; // timestamptz
  embed_url?: string;
  stream_type?: string;
  platform?: string;
  stream_key?: string;
  thumbnail_url?: string;
  owner_id?: string; // UUID
  stream_url?: string;
  start_time: string; // timestamptz
  updated_at: string; // timestamptz
  flag_count: number;
  is_hidden: boolean;
  type: string; // default 'video'
  stream_mode: string; // default 'solo'
  tags: string[];
  viewer_count: number;
  max_viewers: number;
  jitsi_room_config?: any; // jsonb
  room_name?: string;
  livestream_type: string; // default 'public'
  redirect_url?: string; // Custom redirect URL when stream ends
  category?: string; // Stream category
}

export interface LivestreamState {
  // State
  currentStream: StreamInfo | null;
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  streams: StreamInfo[];
  recentStreams: StreamInfo[];
  upcomingStreams: StreamInfo[];
  scheduledStreams: StreamInfo[];
  
  // Actions
  setCurrentStream: (stream: StreamInfo | null) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Stream management
  createStream: (streamData: Omit<StreamInfo, 'id' | 'created_at' | 'updated_at' | 'is_live' | 'viewer_count'>) => Promise<StreamInfo>;
  startStream: (streamId: string) => Promise<void>;
  stopStream: (streamId: string) => Promise<void>;
  updateStream: (streamId: string, updates: Partial<StreamInfo>) => Promise<void>;
  deleteStream: (streamId: string) => Promise<void>;
  createScheduledStream: (streamData: Omit<StreamInfo, 'id' | 'created_at' | 'updated_at' | 'is_live' | 'viewer_count'>) => Promise<StreamInfo>;
  
  // Stream fetching
  fetchStreams: () => Promise<void>;
  fetchRecentStreams: () => Promise<void>;
  fetchUpcomingStreams: () => Promise<void>;
  fetchScheduledStreams: () => Promise<void>;
  
  // Viewer count
  updateViewerCount: (streamId: string, count: number) => void;
  incrementViewerCount: (streamId: string) => void;
  decrementViewerCount: (streamId: string) => void;
}

export const useLivestreamStore = create<LivestreamState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentStream: null,
      isStreaming: false,
      isLoading: false,
      error: null,
      streams: [],
      recentStreams: [],
      upcomingStreams: [],
      scheduledStreams: [],

      // Basic actions
      setCurrentStream: (currentStream) => set({ currentStream }),
      setIsStreaming: (isStreaming) => set({ isStreaming }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Stream management
      createStream: async (streamData) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = useAuthStore.getState();
          if (!user) throw new Error('User not authenticated');
          // 1. Check for active stream
          const hasActive = await databaseService.hasActiveLivestream(user.uid);
          if (hasActive) throw new Error('You already have an active livestream. Please end it before starting a new one.');
          // 2. Add streamer_id
          const newStream = await databaseService.createLivestream({
            ...streamData,
            streamer_id: user.uid,
            is_live: true,
            started_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          const { streams } = get();
          const updatedStreams = [...streams, newStream];
          set({ 
            streams: updatedStreams,
            currentStream: newStream,
            isLoading: false 
          });
          return newStream;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create stream', 
            isLoading: false 
          });
          throw error;
        }
      },

      createScheduledStream: async (streamData) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = useAuthStore.getState();
          if (!user) throw new Error('User not authenticated');
          
          // Add streamer_id for scheduled stream
          const newStream = await databaseService.createScheduledStream({
            ...streamData,
            streamer_id: user.uid,
          });
          
          const { scheduledStreams } = get();
          const updatedScheduledStreams = [...scheduledStreams, newStream];
          set({ 
            scheduledStreams: updatedScheduledStreams,
            isLoading: false 
          });
          return newStream;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create scheduled stream', 
            isLoading: false 
          });
          throw error;
        }
      },

      startStream: async (streamId) => {
        set({ isLoading: true, error: null });
        try {
          const updatedStream = await databaseService.startLivestream(streamId);
          const { streams } = get();
          const updatedStreams = streams.map(stream => 
            stream.id === streamId ? updatedStream : stream
          );
          
          set({ 
            streams: updatedStreams,
            currentStream: updatedStream,
            isStreaming: true,
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to start stream', 
            isLoading: false 
          });
        }
      },

      stopStream: async (streamId) => {
        set({ isLoading: true, error: null });
        try {
          const updatedStream = await databaseService.stopLivestream(streamId);
          const { streams } = get();
          const updatedStreams = streams.map(stream => 
            stream.id === streamId ? updatedStream : stream
          );
          
          set({ 
            streams: updatedStreams,
            currentStream: updatedStream,
            isStreaming: false,
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to stop stream', 
            isLoading: false 
          });
        }
      },

      updateStream: async (streamId, updates) => {
        set({ isLoading: true, error: null });
        try {
          const updatedStream = await databaseService.updateLivestream(streamId, updates);
          const { streams } = get();
          const updatedStreams = streams.map(stream => 
            stream.id === streamId ? updatedStream : stream
          );
          
          set({ 
            streams: updatedStreams,
            currentStream: updatedStream,
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update stream', 
            isLoading: false 
          });
        }
      },

      deleteStream: async (streamId) => {
        set({ isLoading: true, error: null });
        try {
          await databaseService.deleteLivestream(streamId);
          const { streams, currentStream } = get();
          const updatedStreams = streams.filter(stream => stream.id !== streamId);
          
          set({ 
            streams: updatedStreams,
            currentStream: currentStream?.id === streamId ? null : currentStream,
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete stream', 
            isLoading: false 
          });
        }
      },

      // Stream fetching
      fetchStreams: async () => {
        set({ isLoading: true, error: null });
        try {
          const streams = await databaseService.getLivestreams();
          set({ streams, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch streams', 
            isLoading: false 
          });
        }
      },

      fetchRecentStreams: async () => {
        set({ isLoading: true, error: null });
        try {
          const recentStreams = await databaseService.getRecentLivestreams(10);
          set({ recentStreams, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch recent streams', 
            isLoading: false 
          });
        }
      },

      fetchUpcomingStreams: async () => {
        set({ isLoading: true, error: null });
        try {
          const upcomingStreams = await databaseService.getUpcomingLivestreams();
          set({ upcomingStreams, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch upcoming streams', 
            isLoading: false 
          });
        }
      },

      fetchScheduledStreams: async () => {
        set({ isLoading: true, error: null });
        try {
          const scheduledStreams = await databaseService.getScheduledLivestreams();
          set({ scheduledStreams, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch scheduled streams', 
            isLoading: false 
          });
        }
      },

      // Viewer count management
      updateViewerCount: (streamId, count) => {
        const { streams, currentStream } = get();
        const updatedStreams = streams.map(stream => 
          stream.id === streamId 
            ? { ...stream, viewer_count: count }
            : stream
        );

        const updatedCurrentStream = currentStream?.id === streamId 
          ? { ...currentStream, viewer_count: count }
          : currentStream;
        
        set({ 
          streams: updatedStreams,
          currentStream: updatedCurrentStream
        });
      },

      incrementViewerCount: (streamId) => {
        const { streams, currentStream } = get();
        const updatedStreams = streams.map(stream => 
          stream.id === streamId 
            ? { ...stream, viewer_count: stream.viewer_count + 1 }
            : stream
        );

        const updatedCurrentStream = currentStream?.id === streamId 
          ? { ...currentStream, viewer_count: currentStream.viewer_count + 1 }
          : currentStream;
        
        set({ 
          streams: updatedStreams,
          currentStream: updatedCurrentStream
        });
      },

      decrementViewerCount: (streamId) => {
        const { streams, currentStream } = get();
        const updatedStreams = streams.map(stream => 
          stream.id === streamId 
            ? { ...stream, viewer_count: Math.max(0, stream.viewer_count - 1) }
            : stream
        );

        const updatedCurrentStream = currentStream?.id === streamId 
          ? { ...currentStream, viewer_count: Math.max(0, currentStream.viewer_count - 1) }
          : currentStream;
        
        set({ 
          streams: updatedStreams,
          currentStream: updatedCurrentStream
        });
      },
    }),
    {
      name: 'livestream-storage',
      partialize: (state) => ({ 
        streams: state.streams,
        recentStreams: state.recentStreams,
        upcomingStreams: state.upcomingStreams
      }),
    }
  )
); 