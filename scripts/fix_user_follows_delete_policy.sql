-- Fix user_follows table RLS policy to allow users to delete their followers
-- Run this in Supabase SQL Editor

-- Drop the existing delete policy
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.user_follows;

-- Create a new policy that allows users to delete both:
-- 1. Their own follows (when they are the follower)
-- 2. Their followers (when they are the one being followed)
CREATE POLICY "Users can delete their own follows and followers" ON public.user_follows
  FOR DELETE USING (
    auth.uid()::text = follower_id::text OR 
    auth.uid()::text = following_id::text
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_follows' 
AND policyname = 'Users can delete their own follows and followers'; 