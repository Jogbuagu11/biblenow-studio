import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import jwtAuthService from '../services/jwtAuthService';

// Authentication now handled by Supabase verified_profiles table

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'moderator' | 'user';
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isInitialized: false,

      // Actions
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
        error: null 
      }),

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
          
          // Create user object from Supabase data
          // All verified users are moderators
          const user: User = {
            uid: authResult.user.id,
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
          // Simple frontend logout
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

      signUp: async (email, password, displayName) => {
        set({ isLoading: true, error: null });
        try {
          // Signup is disabled - users must be pre-verified
          throw new Error('New user registration is not allowed. Please contact support to be added to verified profiles.');
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Signup failed', 
            isLoading: false 
          });
        }
      },

      resetPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Implement Firebase Auth password reset
          // await sendPasswordResetEmail(auth, email);
          
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Password reset failed', 
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
        set({ isInitialized: true });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
); 