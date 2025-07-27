-- Test Robust End Stream System
-- Run this in your Supabase SQL Editor to test the new end stream functions

-- 1. First, let's see the current state
SELECT 
    'Current Stream Status' as test_step,
    COUNT(*) as total_streams,
    COUNT(CASE WHEN is_live = true THEN 1 END) as live_streams,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_streams,
    COUNT(CASE WHEN status = 'ended' THEN 1 END) as ended_streams
FROM public.livestreams;

-- 2. Show active streams
SELECT 
    'Active Streams' as test_step,
    id,
    title,
    streamer_id,
    started_at,
    ended_at,
    is_live,
    status,
    CASE 
        WHEN started_at IS NOT NULL AND ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
        WHEN started_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
        ELSE 0 
    END as duration_minutes
FROM public.livestreams 
WHERE is_live = true OR status = 'active'
ORDER BY started_at DESC;

-- 3. Test the comprehensive end stream function
DO $$
DECLARE
    test_result JSON;
    test_user_id UUID;
BEGIN
    -- Get a test user ID (first user with active streams)
    SELECT streamer_id INTO test_user_id
    FROM public.livestreams 
    WHERE is_live = true OR status = 'active'
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No active streams found for testing';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing end stream functions with user ID: %', test_user_id;
    
    -- Test ending streams for specific user
    test_result := end_stream_comprehensive(p_streamer_id => test_user_id);
    RAISE NOTICE 'End stream for user result: %', test_result;
    
    -- Test auto-end function
    PERFORM auto_end_inactive_streams();
    RAISE NOTICE 'Auto-end function completed';
    
END $$;

-- 4. Test listing active streams function
SELECT 
    'List Active Streams Function' as test_step,
    *
FROM list_active_streams()
LIMIT 5;

-- 5. Test getting stream status (if we have any streams)
DO $$
DECLARE
    test_stream_id UUID;
    status_result JSON;
BEGIN
    -- Get a test stream ID
    SELECT id INTO test_stream_id
    FROM public.livestreams 
    LIMIT 1;
    
    IF test_stream_id IS NULL THEN
        RAISE NOTICE 'No streams found for status test';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing get stream status for stream ID: %', test_stream_id;
    status_result := get_stream_status(test_stream_id);
    RAISE NOTICE 'Stream status result: %', status_result;
    
END $$;

-- 6. Show final status after tests
SELECT 
    'Final Status After Tests' as test_step,
    COUNT(*) as total_streams,
    COUNT(CASE WHEN is_live = true THEN 1 END) as live_streams,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_streams,
    COUNT(CASE WHEN status = 'ended' THEN 1 END) as ended_streams
FROM public.livestreams;

-- 7. Show recent streams
SELECT 
    'Recent Streams' as test_step,
    id,
    title,
    streamer_id,
    started_at,
    ended_at,
    is_live,
    status,
    updated_at,
    CASE 
        WHEN started_at IS NOT NULL AND ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
        WHEN started_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
        ELSE 0 
    END as duration_minutes
FROM public.livestreams 
ORDER BY updated_at DESC
LIMIT 10;

-- 8. Test weekly usage recording
SELECT 
    'Weekly Usage After Stream End' as test_step,
    COUNT(*) as weekly_usage_records
FROM public.weekly_usage;

-- Show weekly usage details
SELECT 
    wu.user_id,
    vp.email,
    wu.week_start_date,
    wu.streamed_minutes,
    wu.updated_at
FROM public.weekly_usage wu
JOIN public.verified_profiles vp ON wu.user_id = vp.id
ORDER BY wu.week_start_date DESC, wu.streamed_minutes DESC;

-- 9. Verify all functions exist
SELECT 
    'Function Verification' as test_step,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'end_stream_comprehensive',
    'auto_end_inactive_streams',
    'end_stream_on_user_disconnect',
    'get_stream_status',
    'list_active_streams'
)
ORDER BY routine_name; 