-- =====================================================
-- LIVESTREAMS MULTI-ROLE RLS POLICIES
-- =====================================================
-- Row Level Security policies for different user roles:
-- - Admins: Full CRUD access to all livestreams
-- - Authenticated Users: CRUD access to their own livestreams
-- - Regular Users: CRUD access to their own livestreams
-- - Viewers: Read-only access to all livestreams

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
DROP POLICY IF EXISTS "Admins have full access to livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Viewers can read livestreams" ON public.livestreams;

-- =====================================================
-- RLS POLICIES BY ROLE
-- =====================================================

-- =====================================================
-- 1. ADMIN POLICIES (Full CRUD access to all livestreams)
-- =====================================================

-- Admin INSERT: Admins can create livestreams for any user
CREATE POLICY "Admins can insert any livestream" ON public.livestreams
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- Admin SELECT: Admins can read all livestreams
CREATE POLICY "Admins can read all livestreams" ON public.livestreams
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- Admin UPDATE: Admins can update any livestream
CREATE POLICY "Admins can update any livestream" ON public.livestreams
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- Admin DELETE: Admins can delete any livestream
CREATE POLICY "Admins can delete any livestream" ON public.livestreams
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 2. AUTHENTICATED USER POLICIES (CRUD access to own livestreams)
-- =====================================================

-- Authenticated User INSERT: Can create livestreams with their own streamer_id
CREATE POLICY "Authenticated users can insert own livestreams" ON public.livestreams
    FOR INSERT 
    WITH CHECK (
        auth.uid() = streamer_id 
        AND 
        EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        )
        AND
        NOT EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- Authenticated User SELECT: Can read their own livestreams
CREATE POLICY "Authenticated users can read own livestreams" ON public.livestreams
    FOR SELECT 
    USING (
        (auth.uid() = streamer_id AND EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        ))
        AND
        NOT EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- Authenticated User UPDATE: Can update their own livestreams
CREATE POLICY "Authenticated users can update own livestreams" ON public.livestreams
    FOR UPDATE 
    USING (
        auth.uid() = streamer_id 
        AND 
        EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        )
        AND
        NOT EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- Authenticated User DELETE: Can delete their own livestreams
CREATE POLICY "Authenticated users can delete own livestreams" ON public.livestreams
    FOR DELETE 
    USING (
        auth.uid() = streamer_id 
        AND 
        EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        )
        AND
        NOT EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 3. REGULAR USER POLICIES (CRUD access to own livestreams)
-- =====================================================

-- Regular User INSERT: Can create livestreams with their own streamer_id
CREATE POLICY "Regular users can insert own livestreams" ON public.livestreams
    FOR INSERT 
    WITH CHECK (
        auth.uid() = streamer_id 
        AND 
        NOT EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        )
        AND
        NOT EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- Regular User SELECT: Can read their own livestreams
CREATE POLICY "Regular users can read own livestreams" ON public.livestreams
    FOR SELECT 
    USING (
        (auth.uid() = streamer_id AND NOT EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        ))
        AND
        NOT EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- Regular User UPDATE: Can update their own livestreams
CREATE POLICY "Regular users can update own livestreams" ON public.livestreams
    FOR UPDATE 
    USING (
        auth.uid() = streamer_id 
        AND 
        NOT EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        )
        AND
        NOT EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- Regular User DELETE: Can delete their own livestreams
CREATE POLICY "Regular users can delete own livestreams" ON public.livestreams
    FOR DELETE 
    USING (
        auth.uid() = streamer_id 
        AND 
        NOT EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        )
        AND
        NOT EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 4. VIEWER POLICIES (Read-only access to all livestreams)
-- =====================================================

-- Viewer SELECT: Anyone can read livestreams (for discovery)
CREATE POLICY "Viewers can read livestreams" ON public.livestreams
    FOR SELECT 
    USING (true);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify RLS is enabled
SELECT 
    'RLS Status' as check_type,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN 'ENABLED' 
        ELSE 'DISABLED' 
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'livestreams';

-- Verify all policies were created
SELECT 
    'Policy Check' as check_type,
    policyname,
    cmd,
    permissive,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'HAS USING CLAUSE'
        ELSE 'NO USING CLAUSE'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'HAS WITH CHECK CLAUSE'
        ELSE 'NO WITH CHECK CLAUSE'
    END as with_check_clause
FROM pg_policies 
WHERE tablename = 'livestreams' 
AND schemaname = 'public'
ORDER BY policyname;

-- Count policies by operation
SELECT 
    'Policy Count' as check_type,
    cmd as operation,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'livestreams' 
AND schemaname = 'public'
GROUP BY cmd
ORDER BY cmd; 