import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Debug logging
console.log('Supabase URL:', supabaseUrl ? 'Set' : 'NOT SET');
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'NOT SET');

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase; 