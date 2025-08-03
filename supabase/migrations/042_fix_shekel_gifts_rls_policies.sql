-- Fix RLS policies for shekel_gifts table
-- The issue is that RLS policies are not properly configured for authenticated users

-- First, let's check if RLS is enabled
ALTER TABLE public.shekel_gifts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own shekel gifts" ON shekel_gifts;
DROP POLICY IF EXISTS "Users can insert their own shekel gifts" ON shekel_gifts;
DROP POLICY IF EXISTS "Users can update their own shekel gifts" ON shekel_gifts;
DROP POLICY IF EXISTS "Users can delete their own shekel gifts" ON shekel_gifts;

-- Create new policies that work with authenticated users
-- Policy for viewing gifts (users can see gifts they sent or received)
CREATE POLICY "Users can view their own shekel gifts" ON shekel_gifts
  FOR SELECT USING (
    auth.uid()::text = sender_id OR auth.uid()::text = recipient_id
  );

-- Policy for inserting gifts (users can only send gifts as themselves)
CREATE POLICY "Users can insert their own shekel gifts" ON shekel_gifts
  FOR INSERT WITH CHECK (
    auth.uid()::text = sender_id
  );

-- Policy for updating gifts (users can update gifts they sent or received)
CREATE POLICY "Users can update their own shekel gifts" ON shekel_gifts
  FOR UPDATE USING (
    auth.uid()::text = sender_id OR auth.uid()::text = recipient_id
  );

-- Policy for deleting gifts (users can delete gifts they sent or received)
CREATE POLICY "Users can delete their own shekel gifts" ON shekel_gifts
  FOR DELETE USING (
    auth.uid()::text = sender_id OR auth.uid()::text = recipient_id
  );

-- Also fix RLS policies for verified_profiles and profiles tables
-- These might be needed for the shekel service to work properly

-- For verified_profiles
ALTER TABLE public.verified_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own verified profile" ON verified_profiles;
CREATE POLICY "Users can view their own verified profile" ON verified_profiles
  FOR SELECT USING (
    auth.uid()::text = id
  );

-- For profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (
    auth.uid()::text = id
  ); 