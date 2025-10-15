import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import jwtAuthService from '../services/jwtAuthService';
import { validateUserIdFormat } from '../utils/clearCache';
import { supabase } from '../config/supabase';

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
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<SupabaseUser>) => Promise<void>;
  clearError: () => void;
  initialize: () => void;
  handleOAuthCallback: () => Promise<void>;
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

      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/dashboard`
            }
          });

          if (error) {
            throw new Error(error.message);
          }

          // The OAuth flow will redirect the user, so we don't need to set user state here
          // The user state will be set when they return from the OAuth flow
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Google login failed', 
            isLoading: false 
          });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
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
        
        // Set up auth state listener for OAuth callbacks
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const user: SupabaseUser = {
              uid: session.user.id,
              email: session.user.email || '',
              displayName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
              photoURL: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
              role: 'moderator' // All OAuth users are moderators
            };
            
            set({ 
              user, 
              isAuthenticated: true, 
              isLoading: false,
              error: null 
            });
          } else if (event === 'SIGNED_OUT') {
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false,
              error: null 
            });
          }
        });
        
        set({ isInitialized: true });
      },

      handleOAuthCallback: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            throw new Error(error.message);
          }
          
          if (data.session?.user) {
            const user: SupabaseUser = {
              uid: data.session.user.id,
              email: data.session.user.email || '',
              displayName: data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name || '',
              photoURL: data.session.user.user_metadata?.avatar_url || data.session.user.user_metadata?.picture,
              role: 'moderator'
            };
            
            set({ 
              user, 
              isAuthenticated: true, 
              isLoading: false,
              error: null 
            });
          } else {
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false,
              error: 'No active session found' 
            });
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'OAuth callback failed', 
            isLoading: false 
          });
        }
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