import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import jwtAuthService from '../services/jwtAuthService';
import { validateUserIdFormat } from '../utils/clearCache';
import { SupabaseAuthBridge } from '../services/supabaseAuthBridge';

export interface SupabaseUser {
  uid: string; // Supabase UUID
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'moderator' | 'user';
}

interface SupabaseAuthState {
  // State
  user: SupabaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Actions
  setUser: (user: SupabaseUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<SupabaseUser>) => Promise<void>;
  clearError: () => void;
  initialize: () => void;
}

export const useSupabaseAuthStore = create<SupabaseAuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isInitialized: false,

      // Actions
      setUser: (user) => {
        // Only allow Supabase UUIDs
        if (user && !validateUserIdFormat(user.uid)) {
          console.error('Invalid user ID format. Only Supabase UUIDs are allowed:', user.uid);
          set({ 
            user: null, 
            isAuthenticated: false,
            error: 'Invalid authentication format. Only Supabase authentication is supported.' 
          });
          return;
        }
        
        set({ 
          user, 
          isAuthenticated: !!user,
          error: null 
        });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          // Validate required fields
          if (!email || !password) {
            throw new Error('Email and password are required');
          }
          
          // Use the auth bridge to authenticate with both systems
          const isAuthenticated = await SupabaseAuthBridge.authenticateWithSupabase(email, password);
          
          if (!isAuthenticated) {
            throw new Error('Authentication failed with both systems');
          }
          
          // Authenticate against Supabase verified_profiles table
          const authResult = await jwtAuthService.authenticateUser(email, password);
          
          if (!authResult.success || !authResult.user) {
            throw new Error(authResult.error || 'Authentication failed');
          }
          
          // Validate that the returned user ID is a proper Supabase UUID
          if (!validateUserIdFormat(authResult.user.id)) {
            throw new Error('Invalid user ID format received from authentication');
          }
          
          // Create user object from Supabase data
          const user: SupabaseUser = {
            uid: authResult.user.id, // This should be a Supabase UUID
            email: authResult.user.email,
            displayName: authResult.user.displayName,
            role: 'moderator' // All verified users are moderators
          };
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Login failed', 
            isLoading: false 
          });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          // Sign out from both authentication systems
          await SupabaseAuthBridge.signOut();
          
          // Clear all authentication data
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: null 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Logout failed', 
            isLoading: false 
          });
        }
      },

      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return;

        set({ isLoading: true, error: null });
        try {
          // Update profile in Supabase
          const updateResult = await jwtAuthService.updateUserProfile(user.uid, updates);
          
          if (!updateResult.success) {
            throw new Error(updateResult.error || 'Profile update failed');
          }
          
          const updatedUser = { ...user, ...updates };
          set({ 
            user: updatedUser, 
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Profile update failed', 
            isLoading: false 
          });
        }
      },

      initialize: () => {
        // Clear any old authentication data on initialization
        const clearOldAuth = () => {
          try {
            // Clear any cached authentication data
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.includes('auth') || key.includes('user') || key.includes('firebase'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            console.log('Cleared old authentication data. Only Supabase authentication is allowed.');
          } catch (error) {
            console.error('Error clearing old auth data:', error);
          }
        };
        
        clearOldAuth();
        set({ isInitialized: true });
      },
    }),
    {
      name: 'supabase-auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
      onRehydrateStorage: () => (state) => {
        // Validate restored state to ensure only Supabase UUIDs are allowed
        if (state?.user && !validateUserIdFormat(state.user.uid)) {
          console.error('Detected invalid auth data in storage. Clearing and requiring Supabase re-authentication.');
          // Clear the invalid data
          state.user = null;
          state.isAuthenticated = false;
          state.error = 'Invalid authentication format. Please log in again with Supabase.';
        }
      },
    }
  )
); 