-- Simple Test for End Stream Functions
-- Run this in your Supabase SQL Editor

-- 1. First, let's see what we have
SELECT 
    'Current Streams' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN is_live = true THEN 1 END) as live,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active
FROM public.livestreams;

-- 2. Test the function directly
SELECT end_stream_comprehensive(p_force_end_all => false);

-- 3. Test with a specific user (if you have one)
DO $$
DECLARE
    test_user UUID;
    result JSON;
BEGIN
    -- Get first user with any streams
    SELECT streamer_id INTO test_user
    FROM public.livestreams 
    LIMIT 1;
    
    IF test_user IS NOT NULL THEN
        RAISE NOTICE 'Testing with user: %', test_user;
        result := end_stream_comprehensive(p_streamer_id => test_user);
        RAISE NOTICE 'Result: %', result;
    ELSE
        RAISE NOTICE 'No users found to test with';
    END IF;
END $$;

-- 4. Test auto-end function
SELECT auto_end_inactive_streams();

-- 5. Check final status
SELECT 
    'Final Status' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN is_live = true THEN 1 END) as live,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active
FROM public.livestreams; 