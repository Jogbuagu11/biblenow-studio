-- Debug RLS Issue for Livestreams
-- Run this in your Supabase SQL Editor

-- 1. Check if RLS is enabled
SELECT 
    'RLS Status Check' as step,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'livestreams';

-- 2. Show all current policies
SELECT 
    'All Current Policies' as step,
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

-- 3. Check current user authentication
SELECT 
    'Authentication Check' as step,
    auth.uid() as current_user_id,
    auth.jwt() ->> 'role' as user_role,
    auth.jwt() ->> 'email' as user_email,
    auth.jwt() ->> 'sub' as user_sub,
    auth.jwt() ->> 'aud' as audience;

-- 4. Check if the user exists in verified_profiles
SELECT 
    'User Profile Check' as step,
    vp.id as profile_id,
    vp.email,
    vp.subscription_plan,
    auth.uid() as auth_user_id,
    CASE 
        WHEN vp.id::text = auth.uid()::text THEN 'MATCH'
        ELSE 'MISMATCH'
    END as id_match
FROM public.verified_profiles vp
WHERE vp.email = auth.jwt() ->> 'email';

-- 5. Test the exact INSERT that's failing
DO $$
DECLARE
    test_user_id UUID;
    test_user_id_text TEXT;
    insert_result RECORD;
BEGIN
    -- Get the current user ID
    test_user_id := auth.uid();
    test_user_id_text := auth.uid()::text;
    
    RAISE NOTICE 'Testing with user ID: % (text: %)', test_user_id, test_user_id_text;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user found';
        RETURN;
    END IF;
    
    -- Try to insert with UUID
    BEGIN
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
            'Test Stream - UUID Test',
            'Testing with UUID streamer_id',
            test_user_id,
            false,
            'active',
            'Test',
            'video',
            0,
            NOW()
        ) RETURNING * INTO insert_result;
        
        RAISE NOTICE 'SUCCESS: Inserted with UUID: %', insert_result.id;
        
        -- Clean up
        DELETE FROM public.livestreams WHERE id = insert_result.id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'FAILED with UUID: %', SQLERRM;
    END;
    
    -- Try to insert with TEXT
    BEGIN
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
            'Test Stream - TEXT Test',
            'Testing with TEXT streamer_id',
            test_user_id_text,
            false,
            'active',
            'Test',
            'video',
            0,
            NOW()
        ) RETURNING * INTO insert_result;
        
        RAISE NOTICE 'SUCCESS: Inserted with TEXT: %', insert_result.id;
        
        -- Clean up
        DELETE FROM public.livestreams WHERE id = insert_result.id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'FAILED with TEXT: %', SQLERRM;
    END;
    
END $$;

-- 6. Check the exact policy that's being violated
SELECT 
    'Policy Analysis' as step,
    policyname,
    cmd,
    qual,
    with_check,
    CASE 
        WHEN cmd = 'INSERT' AND with_check IS NOT NULL THEN 'This policy controls INSERT'
        WHEN cmd = 'SELECT' AND qual IS NOT NULL THEN 'This policy controls SELECT'
        WHEN cmd = 'UPDATE' AND (qual IS NOT NULL OR with_check IS NOT NULL) THEN 'This policy controls UPDATE'
        WHEN cmd = 'DELETE' AND qual IS NOT NULL THEN 'This policy controls DELETE'
        ELSE 'This policy may not be relevant'
    END as relevance
FROM pg_policies
WHERE tablename = 'livestreams'
AND schemaname = 'public'
AND cmd = 'INSERT'; 