import { supabase } from '../config/supabase';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import jwtAuthService from './jwtAuthService';

export class SupabaseAuthBridge {
  /**
   * Bridge custom authentication with Supabase auth for RLS policies
   */
  static async authenticateWithSupabase(email: string, password: string): Promise<boolean> {
    try {
      // First, authenticate with custom system
      const customAuthResult = await jwtAuthService.authenticateUser(email, password);
      
      if (!customAuthResult.success || !customAuthResult.user) {
        console.error('Custom authentication failed:', customAuthResult.error);
        return false;
      }

      // Then, authenticate with Supabase auth using the same credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        console.error('Supabase authentication failed:', error);
        return false;
      }

      console.log('Successfully authenticated with both custom and Supabase auth');
      return true;
    } catch (error) {
      console.error('Error in auth bridge:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated with both systems
   */
  static async checkDualAuthentication(): Promise<boolean> {
    try {
      // Check custom auth store
      const authStore = useSupabaseAuthStore.getState();
      if (!authStore.isAuthenticated || !authStore.user) {
        console.log('User not authenticated in custom auth store');
        return false;
      }

      // Check Supabase auth
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.log('User not authenticated in Supabase auth');
        return false;
      }

      console.log('User authenticated with both systems');
      return true;
    } catch (error) {
      console.error('Error checking dual authentication:', error);
      return false;
    }
  }

  /**
   * Ensure user is authenticated with Supabase for RLS policies
   */
  static async ensureSupabaseAuth(): Promise<boolean> {
    try {
      // Check if already authenticated with Supabase
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (!error && user) {
        console.log('User already authenticated with Supabase');
        return true;
      }

      // If not authenticated, try to authenticate with stored credentials
      const authStore = useSupabaseAuthStore.getState();
      if (!authStore.user) {
        console.log('No user in auth store to authenticate with Supabase');
        return false;
      }

      // Try to authenticate with Supabase using the user's email
      // Note: This assumes the password is 'biblenow123' for all users
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: authStore.user.email,
        password: 'biblenow123' // Default password for verified users
      });

      if (authError) {
        console.error('Failed to authenticate with Supabase:', authError);
        return false;
      }

      console.log('Successfully authenticated with Supabase for RLS policies');
      return true;
    } catch (error) {
      console.error('Error ensuring Supabase auth:', error);
      return false;
    }
  }

  /**
   * Sign out from both authentication systems
   */
  static async signOut(): Promise<void> {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Sign out from custom auth store
      const authStore = useSupabaseAuthStore.getState();
      await authStore.logout();
      
      console.log('Signed out from both authentication systems');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }
} 