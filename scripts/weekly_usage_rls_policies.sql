-- LIVESTREAM WEEKLY USAGE RLS POLICIES
-- This script creates Row Level Security policies for the livestream_weekly_usage table
-- with different access levels for different user roles
-- 
-- SECURITY NOTE: Users CANNOT delete their own weekly usage records
-- This prevents users from cheating the streaming limit system
-- Only admins can delete records (for data cleanup purposes)

-- Enable RLS on livestream_weekly_usage table
ALTER TABLE public.livestream_weekly_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can read all weekly usage" ON public.livestream_weekly_usage;
DROP POLICY IF EXISTS "Admins can insert weekly usage" ON public.livestream_weekly_usage;
DROP POLICY IF EXISTS "Admins can update weekly usage" ON public.livestream_weekly_usage;
DROP POLICY IF EXISTS "Admins can delete weekly usage" ON public.livestream_weekly_usage;

DROP POLICY IF EXISTS "Authenticated users can read own weekly usage" ON public.livestream_weekly_usage;
DROP POLICY IF EXISTS "Authenticated users can insert own weekly usage" ON public.livestream_weekly_usage;
DROP POLICY IF EXISTS "Authenticated users can update own weekly usage" ON public.livestream_weekly_usage;
DROP POLICY IF EXISTS "Authenticated users can delete own weekly usage" ON public.livestream_weekly_usage;

DROP POLICY IF EXISTS "Regular users can read own weekly usage" ON public.livestream_weekly_usage;
DROP POLICY IF EXISTS "Regular users can insert own weekly usage" ON public.livestream_weekly_usage;
DROP POLICY IF EXISTS "Regular users can update own weekly usage" ON public.livestream_weekly_usage;
DROP POLICY IF EXISTS "Regular users can delete own weekly usage" ON public.livestream_weekly_usage;

DROP POLICY IF EXISTS "Viewers can read weekly usage" ON public.livestream_weekly_usage;

-- =============================================================================
-- ADMIN POLICIES (Full CRUD access to all weekly usage records)
-- =============================================================================

-- Admin SELECT: Admins can read all weekly usage records
CREATE POLICY "Admins can read all weekly usage" ON public.livestream_weekly_usage
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- Admin INSERT: Admins can create weekly usage records for any user
CREATE POLICY "Admins can insert weekly usage" ON public.livestream_weekly_usage
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- Admin UPDATE: Admins can update any weekly usage record
CREATE POLICY "Admins can update weekly usage" ON public.livestream_weekly_usage
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- Admin DELETE: Admins can delete any weekly usage record (for data cleanup only)
CREATE POLICY "Admins can delete weekly usage" ON public.livestream_weekly_usage
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- =============================================================================
-- AUTHENTICATED USER POLICIES (CRUD on own weekly usage, verified users only)
-- =============================================================================

-- Authenticated User SELECT: Can read their own weekly usage (verified users)
CREATE POLICY "Authenticated users can read own weekly usage" ON public.livestream_weekly_usage
    FOR SELECT 
    USING (
        (auth.uid() = user_id AND EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        ))
        AND
        NOT EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- Authenticated User INSERT: Can create their own weekly usage records (verified users)
CREATE POLICY "Authenticated users can insert own weekly usage" ON public.livestream_weekly_usage
    FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id 
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

-- Authenticated User UPDATE: Can update their own weekly usage records (verified users)
CREATE POLICY "Authenticated users can update own weekly usage" ON public.livestream_weekly_usage
    FOR UPDATE 
    USING (
        auth.uid() = user_id 
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

-- Authenticated User DELETE: BLOCKED - Users cannot delete their own weekly usage (security)
-- CREATE POLICY "Authenticated users can delete own weekly usage" ON public.livestream_weekly_usage
--     FOR DELETE 
--     USING (false); -- Always deny delete for security

-- =============================================================================
-- REGULAR USER POLICIES (CRUD on own weekly usage, non-verified users)
-- =============================================================================

-- Regular User SELECT: Can read their own weekly usage (non-verified users)
CREATE POLICY "Regular users can read own weekly usage" ON public.livestream_weekly_usage
    FOR SELECT 
    USING (
        (auth.uid() = user_id AND NOT EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        ))
        AND
        NOT EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid()
        )
    );

-- Regular User INSERT: Can create their own weekly usage records (non-verified users)
CREATE POLICY "Regular users can insert own weekly usage" ON public.livestream_weekly_usage
    FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id 
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

-- Regular User UPDATE: Can update their own weekly usage records (non-verified users)
CREATE POLICY "Regular users can update own weekly usage" ON public.livestream_weekly_usage
    FOR UPDATE 
    USING (
        auth.uid() = user_id 
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

-- Regular User DELETE: BLOCKED - Users cannot delete their own weekly usage (security)
-- CREATE POLICY "Regular users can delete own weekly usage" ON public.livestream_weekly_usage
--     FOR DELETE 
--     USING (false); -- Always deny delete for security

-- =============================================================================
-- VIEWER POLICIES (Read-only access to weekly usage)
-- =============================================================================

-- Viewer SELECT: Can read weekly usage (read-only access)
CREATE POLICY "Viewers can read weekly usage" ON public.livestream_weekly_usage
    FOR SELECT 
    USING (true);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'livestream_weekly_usage';

-- List all policies on livestream_weekly_usage table
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
WHERE tablename = 'livestream_weekly_usage'
ORDER BY policyname;

-- Test policy access (run as different user types)
-- Note: These queries will show different results based on the current user's role

-- Test admin access
-- SELECT COUNT(*) FROM public.livestream_weekly_usage WHERE EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid());

-- Test authenticated user access  
-- SELECT COUNT(*) FROM public.livestream_weekly_usage WHERE auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.verified_profiles WHERE user_id = auth.uid());

-- Test regular user access
-- SELECT COUNT(*) FROM public.livestream_weekly_usage WHERE auth.uid() = user_id AND NOT EXISTS (SELECT 1 FROM public.verified_profiles WHERE user_id = auth.uid());

-- Test viewer access
-- SELECT COUNT(*) FROM public.livestream_weekly_usage; 