-- =====================================================
-- LIVESTREAMS RLS POLICIES
-- =====================================================
-- Row Level Security policies for the livestreams table

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

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- 1. INSERT: Users can create livestreams with their own streamer_id
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

-- 2. SELECT: Users can read their own livestreams, public can view all
CREATE POLICY "Users can read their own livestreams" ON public.livestreams
    FOR SELECT 
    USING (
        -- Users can read their own livestreams
        (auth.uid() = streamer_id AND EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        ))
        OR 
        -- Public can view all livestreams (for discovery)
        true
    );

-- 3. UPDATE: Users can update their own livestreams
CREATE POLICY "Users can update their own livestreams" ON public.livestreams
    FOR UPDATE 
    USING (
        auth.uid() = streamer_id 
        AND 
        EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- 4. DELETE: Users can delete their own livestreams
CREATE POLICY "Users can delete their own livestreams" ON public.livestreams
    FOR DELETE 
    USING (
        auth.uid() = streamer_id 
        AND 
        EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'livestreams';

-- Verify all policies were created
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'livestreams' 
AND schemaname = 'public'
ORDER BY policyname; 