-- Fix Chat Profile Query Errors
-- This script fixes the 400/406 errors when fetching user profiles for chat

-- ========================================
-- STEP 1: Check current table structure
-- ========================================

-- Check the data types of id columns
SELECT 
    'verified_profiles' as table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'verified_profiles' 
AND column_name = 'id'
AND table_schema = 'public';

SELECT 
    'profiles' as table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'id'
AND table_schema = 'public';

-- ========================================
-- STEP 2: Fix RLS policies for profile queries
-- ========================================

-- Enable RLS on verified_profiles if not already enabled
ALTER TABLE public.verified_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read verified profiles" ON public.verified_profiles;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.verified_profiles;
DROP POLICY IF EXISTS "Allow public read access to verified profiles" ON public.verified_profiles;

-- Create permissive policy for profile reading (needed for chat)
CREATE POLICY "Allow public read access to verified profiles" ON public.verified_profiles
    FOR SELECT USING (true);

-- Enable RLS on profiles table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
        DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
        
        -- Create permissive policy for profile reading
        CREATE POLICY "Allow public read access to profiles" ON public.profiles
            FOR SELECT USING (true);
            
        RAISE NOTICE 'Updated profiles table policies';
    ELSE
        RAISE NOTICE 'profiles table does not exist, skipping';
    END IF;
END $$;

-- ========================================
-- STEP 3: Grant permissions
-- ========================================

-- Grant permissions for verified_profiles
GRANT SELECT ON public.verified_profiles TO authenticated;
GRANT SELECT ON public.verified_profiles TO anon;
GRANT SELECT ON public.verified_profiles TO public;

-- Grant permissions for profiles table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        GRANT SELECT ON public.profiles TO authenticated;
        GRANT SELECT ON public.profiles TO anon;
        GRANT SELECT ON public.profiles TO public;
        RAISE NOTICE 'Granted permissions on profiles table';
    END IF;
END $$;

-- ========================================
-- STEP 4: Test profile queries
-- ========================================

-- Test query to verify the fix works
DO $$
DECLARE
    test_user_id TEXT := '29a4414e-d60f-42c1-bbfd-9166f17211a0'; -- Use actual user ID from error
    verified_count INTEGER;
    profile_count INTEGER;
BEGIN
    -- Test verified_profiles query
    SELECT COUNT(*) INTO verified_count 
    FROM public.verified_profiles 
    WHERE id::text = test_user_id;
    
    RAISE NOTICE 'Verified profiles found: %', verified_count;
    
    -- Test profiles query if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO profile_count 
        FROM public.profiles 
        WHERE id::text = test_user_id;
        
        RAISE NOTICE 'Profiles found: %', profile_count;
    END IF;
END $$;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Profile query errors should now be fixed!';
    RAISE NOTICE 'Chat service can now fetch user profiles without 400/406 errors.';
    RAISE NOTICE 'RLS policies allow public read access to profile tables.';
END $$;
