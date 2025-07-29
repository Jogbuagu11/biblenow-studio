-- Clean CRUD RLS Policies for Livestreams
-- This script drops all conflicting policies and creates clean CRUD permissions

-- Enable RLS on livestreams table
ALTER TABLE public.livestreams ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing conflicting policies
DROP POLICY IF EXISTS "Allow admin to delete livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Allow admin to end livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Allow authenticated users to create livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Allow authenticated users to delete livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Allow authenticated users to end livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Public read access" ON public.livestreams;
DROP POLICY IF EXISTS "Users can delete own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can update own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can view all streams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can view own streams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can insert their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can read their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can update their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Public can view livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can create own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can update own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can delete own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Verified users can create streams" ON public.livestreams;
DROP POLICY IF EXISTS "Admins have full access to livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Admin full access" ON public.livestreams;

-- ========================================
-- CLEAN CRUD POLICIES
-- ========================================

-- 1. CREATE (INSERT) - Authenticated users can create livestreams
CREATE POLICY "authenticated_users_create_livestreams" ON public.livestreams
    FOR INSERT 
    WITH CHECK (
        -- Must be authenticated user (verified_profiles)
        EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        )
        AND 
        -- Must set their own streamer_id
        auth.uid() = streamer_id
    );

-- 2. READ (SELECT) - Public can view all livestreams
CREATE POLICY "public_read_livestreams" ON public.livestreams
    FOR SELECT 
    USING (true);

-- 3. UPDATE - Authenticated users can update own, admins can update any
CREATE POLICY "update_livestreams" ON public.livestreams
    FOR UPDATE 
    USING (
        -- Authenticated users can update their own livestreams
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

-- 4. DELETE - Authenticated users can delete own, admins can delete any
CREATE POLICY "delete_livestreams" ON public.livestreams
    FOR DELETE 
    USING (
        -- Authenticated users can delete their own livestreams
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

-- ========================================
-- VERIFY POLICIES
-- ========================================

-- Show all created policies
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'livestreams'
ORDER BY cmd, policyname; 