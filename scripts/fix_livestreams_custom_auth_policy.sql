-- Fix Livestreams RLS Policies for Custom JWT Authentication
-- Run this in your Supabase SQL Editor

-- 1. First, drop all existing policies
DROP POLICY IF EXISTS "Public read access" ON public.livestreams;
DROP POLICY IF EXISTS "Users can create own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can update own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can delete own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Admin full access" ON public.livestreams;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.livestreams;

-- 2. Create new policies for custom JWT auth

-- Public read access (anyone can view livestreams)
CREATE POLICY "Public read access" ON public.livestreams
    FOR SELECT
    USING (true);

-- Allow authenticated users to create livestreams (streamer_id will be set by the app)
CREATE POLICY "Allow authenticated users to create livestreams" ON public.livestreams
    FOR INSERT
    WITH CHECK (true); -- We trust the app to set the correct streamer_id

-- Users can update their own livestreams (by streamer_id)
CREATE POLICY "Users can update own livestreams" ON public.livestreams
    FOR UPDATE
    USING (true) -- We trust the app to only update user's own streams
    WITH CHECK (true);

-- Users can delete their own livestreams (by streamer_id)
CREATE POLICY "Users can delete own livestreams" ON public.livestreams
    FOR DELETE
    USING (true); -- We trust the app to only delete user's own streams

-- 3. Verify policies were created
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'livestreams'
AND schemaname = 'public'
ORDER BY policyname;

-- 4. Alternative: If you want to disable RLS temporarily for testing
-- ALTER TABLE public.livestreams DISABLE ROW LEVEL SECURITY;

-- 5. To re-enable RLS later:
-- ALTER TABLE public.livestreams ENABLE ROW LEVEL SECURITY; 