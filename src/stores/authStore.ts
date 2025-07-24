import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Verified profiles table - in a real app, this would come from a database
const VERIFIED_PROFILES = [
  {
    email: 'mrs.ogbuagu@gmail.com',
    password: 'admin123',
    displayName: 'Mrs. Ogbuagu',
    role: 'user' as const
  },
  // Add more verified profiles here as needed
  // {
  //   email: 'user@example.com',
  //   password: 'password123',
  //   displayName: 'John Doe',
  //   role: 'user' as const
  // }
];

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
          
          // Check if user exists in verified_profiles table
          const verifiedProfile = VERIFIED_PROFILES.find(profile => profile.email === email);
          
          if (!verifiedProfile) {
            throw new Error('Email not found in verified profiles. Please contact support for access.');
          }
          
          // Validate password
          if (verifiedProfile.password !== password) {
            throw new Error('Invalid email or password');
          }
          
          // Create user object from verified profile data
          const user: User = {
            uid: `user-${Date.now()}`,
            email: verifiedProfile.email,
            displayName: verifiedProfile.displayName,
            role: verifiedProfile.role
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
          // TODO: Implement Firebase Auth profile update
          // await updateProfile(auth.currentUser!, updates);
          
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