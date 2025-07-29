-- Complete RLS Policies for Livestreams: Verified Users & Admin Users
-- This script sets up proper permissions for authenticated users

-- Enable RLS on livestreams table
ALTER TABLE public.livestreams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can delete their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can insert their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can read their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can update their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Public can view livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Allow authenticated users to delete livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Allow authenticated users to insert livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Allow authenticated users to update livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Allow authenticated users to select livestreams" ON public.livestreams;

-- 1. DELETE: Verified users can delete their own livestreams, admins can delete any
CREATE POLICY "Users can delete their own livestreams" ON public.livestreams
    FOR DELETE 
    USING (
        -- Verified users (authenticated) can delete their own livestreams
        (auth.uid() = streamer_id AND EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        ))
        OR 
        -- Admin users can delete any livestream
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- 2. INSERT: Verified users can create livestreams with their own streamer_id
CREATE POLICY "Users can insert their own livestreams" ON public.livestreams
    FOR INSERT 
    WITH CHECK (
        auth.uid() = streamer_id 
        AND 
        EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- 3. SELECT: Verified users can read their own livestreams, admins can read all
CREATE POLICY "Users can read their own livestreams" ON public.livestreams
    FOR SELECT 
    USING (
        -- Verified users can read their own livestreams
        (auth.uid() = streamer_id AND EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        ))
        OR 
        -- Admin users can read all livestreams
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- 4. UPDATE: Verified users can update their own livestreams, admins can update any
CREATE POLICY "Users can update their own livestreams" ON public.livestreams
    FOR UPDATE 
    USING (
        -- Verified users can update their own livestreams
        (auth.uid() = streamer_id AND EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        ))
        OR 
        -- Admin users can update any livestream
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- 5. SELECT: Public can view all livestreams (for discovery)
CREATE POLICY "Public can view livestreams" ON public.livestreams
    FOR SELECT 
    USING (true);

-- Verify all policies were created
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'livestreams'
ORDER BY policyname; 