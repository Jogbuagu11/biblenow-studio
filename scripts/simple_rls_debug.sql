-- Simple RLS Debug for Livestreams
-- Run this in your Supabase SQL Editor

-- 1. Check current user
SELECT 
    'Current User' as step,
    auth.uid() as user_id,
    auth.jwt() ->> 'email' as email;

-- 2. Check if RLS is enabled
SELECT 
    'RLS Status' as step,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'livestreams';

-- 3. Show current policies
SELECT 
    'Current Policies' as step,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'livestreams'
AND schemaname = 'public';

-- 4. Test simple insert
DO $$
DECLARE
    user_id UUID;
    result RECORD;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing insert with user ID: %', user_id;
    
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
            'Test Stream',
            'Test Description',
            user_id,
            false,
            'active',
            'Test',
            'video',
            0,
            NOW()
        ) RETURNING * INTO result;
        
        RAISE NOTICE 'SUCCESS: Inserted stream with ID: %', result.id;
        
        -- Clean up
        DELETE FROM public.livestreams WHERE id = result.id;
        RAISE NOTICE 'Cleaned up test stream';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'FAILED: %', SQLERRM;
    END;
END $$; 