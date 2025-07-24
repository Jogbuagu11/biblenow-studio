import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

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
          // TODO: Implement Firebase Auth login
          // const userCredential = await signInWithEmailAndPassword(auth, email, password);
          // const user = userCredential.user;
          
          // Mock login for now
          const mockUser: User = {
            uid: 'mock-uid',
            email,
            displayName: email.split('@')[0],
            role: 'user'
          };
          
          set({ 
            user: mockUser, 
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
          // TODO: Implement Firebase Auth logout
          // await signOut(auth);
          
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
          // TODO: Implement Firebase Auth signup
          // const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          // const user = userCredential.user;
          
          // Mock signup for now
          const mockUser: User = {
            uid: 'mock-uid-' + Date.now(),
            email,
            displayName,
            role: 'user'
          };
          
          set({ 
            user: mockUser, 
            isAuthenticated: true, 
            isLoading: false 
          });
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