-- Fix RLS policies for livestreams table
-- Run this in your Supabase SQL Editor

-- 1. First, let's see the current RLS policies
SELECT 
    'Current RLS policies on livestreams' as step,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'livestreams'
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 2. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public can view livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Streamers can delete own streams" ON public.livestreams;
DROP POLICY IF EXISTS "Streamers can update own streams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can delete their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can insert their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can read their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can update their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can view all streams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can view own streams" ON public.livestreams;
DROP POLICY IF EXISTS "Verified users can create streams" ON public.livestreams;

-- 3. Create new, clean policies

-- Allow public read access to livestreams (needed for viewing streams)
CREATE POLICY "Public can view livestreams" 
ON public.livestreams
FOR SELECT 
USING (true);

-- Allow authenticated users to create their own livestreams
CREATE POLICY "Users can create own livestreams" 
ON public.livestreams
FOR INSERT 
WITH CHECK (
    auth.uid()::text = streamer_id::text
);

-- Allow users to update their own livestreams
CREATE POLICY "Users can update own livestreams" 
ON public.livestreams
FOR UPDATE 
USING (auth.uid()::text = streamer_id::text)
WITH CHECK (auth.uid()::text = streamer_id::text);

-- Allow users to delete their own livestreams
CREATE POLICY "Users can delete own livestreams" 
ON public.livestreams
FOR DELETE 
USING (auth.uid()::text = streamer_id::text);

-- Allow admins full access
CREATE POLICY "Admins have full access to livestreams" 
ON public.livestreams
FOR ALL 
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- 4. Verify the new policies are created
SELECT 
    'New RLS policies on livestreams' as step,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'livestreams'
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 5. Test if a user can create a livestream (this will show the current user context)
SELECT 
    'Current user context' as step,
    auth.uid() as current_user_id,
    auth.jwt() ->> 'role' as user_role,
    auth.jwt() ->> 'email' as user_email; 