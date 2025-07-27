-- Test Authentication and RLS Policies for Livestreams
-- Run this in your Supabase SQL Editor

-- 1. Check if RLS is enabled on livestreams table
SELECT 
    'RLS Status' as step,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'livestreams';

-- 2. Show current RLS policies
SELECT 
    'Current RLS Policies' as step,
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

-- 3. Test current user context
SELECT 
    'Current User Context' as step,
    auth.uid() as current_user_id,
    auth.jwt() ->> 'role' as user_role,
    auth.jwt() ->> 'email' as user_email,
    auth.jwt() ->> 'sub' as user_sub;

-- 4. Test if we can read livestreams (should work for everyone)
SELECT 
    'Test SELECT access' as step,
    COUNT(*) as livestream_count
FROM public.livestreams;

-- 5. Test if we can insert a livestream (should work for authenticated users)
-- This will fail if the user is not authenticated or if streamer_id doesn't match
DO $$
DECLARE
    test_user_id UUID;
    insert_result RECORD;
BEGIN
    -- Get the current user ID
    test_user_id := auth.uid();
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user found';
    ELSE
        -- Try to insert a test livestream
        INSERT INTO public.livestreams (
            title,
            description,
            streamer_id,
            is_live,
            status,
            platform,
            stream_type,
            viewer_count,
            updated_at
        ) VALUES (
            'Test Stream - RLS Test',
            'Testing RLS policies',
            test_user_id,
            false,
            'active',
            'Test',
            'video',
            0,
            NOW()
        ) RETURNING * INTO insert_result;
        
        RAISE NOTICE 'Successfully inserted test livestream: %', insert_result.id;
        
        -- Clean up the test record
        DELETE FROM public.livestreams WHERE id = insert_result.id;
        RAISE NOTICE 'Cleaned up test livestream';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error testing livestream insertion: %', SQLERRM;
END $$;

-- 6. Show recent livestreams to verify access
SELECT 
    'Recent Livestreams' as step,
    id,
    title,
    streamer_id,
    is_live,
    status,
    updated_at
FROM public.livestreams 
ORDER BY updated_at DESC 
LIMIT 5;

-- 7. Check if there are any streams without streamer_id (potential issue)
SELECT 
    'Streams without streamer_id' as step,
    COUNT(*) as count_without_streamer_id
FROM public.livestreams 
WHERE streamer_id IS NULL; 