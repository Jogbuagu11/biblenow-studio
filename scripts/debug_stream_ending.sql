-- Debug Stream Ending Issues
-- Run this in your Supabase SQL Editor to diagnose the problem

-- 1. Check current stream status
SELECT 
    'Current Stream Status' as step,
    COUNT(*) as total_streams,
    COUNT(CASE WHEN is_live = true THEN 1 END) as live_streams,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_streams,
    COUNT(CASE WHEN status = 'ended' THEN 1 END) as ended_streams
FROM public.livestreams;

-- 2. Show all active streams with details
SELECT 
    'Active Streams Details' as step,
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
WHERE is_live = true OR status = 'active'
ORDER BY started_at DESC;

-- 3. Check if the end_stream_comprehensive function exists
SELECT 
    'Function Check' as step,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'end_stream_comprehensive'
AND routine_schema = 'public';

-- 4. Test the function with a specific user (replace with actual user ID)
-- First, get a user ID that has active streams
SELECT 
    'Users with Active Streams' as step,
    streamer_id,
    COUNT(*) as active_stream_count
FROM public.livestreams 
WHERE is_live = true OR status = 'active'
GROUP BY streamer_id;

-- 5. Test the function manually (replace USER_ID_HERE with actual user ID)
-- SELECT end_stream_comprehensive(p_streamer_id => 'USER_ID_HERE'::UUID);

-- 6. Check RLS policies that might be blocking updates
SELECT 
    'RLS Policies' as step,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'livestreams'
AND schemaname = 'public';

-- 7. Check if RLS is enabled
SELECT 
    'RLS Status' as step,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'livestreams'
AND schemaname = 'public';

-- 8. Test a simple update to see if RLS is blocking
-- This will help identify if the issue is RLS-related
SELECT 
    'Testing Simple Update' as step,
    'Run this manually to test:' as instruction,
    'UPDATE public.livestreams SET updated_at = NOW() WHERE is_live = true LIMIT 1;' as test_query;

-- 9. Show recent stream activity
SELECT 
    'Recent Stream Activity' as step,
    id,
    title,
    streamer_id,
    started_at,
    ended_at,
    is_live,
    status,
    updated_at
FROM public.livestreams 
ORDER BY updated_at DESC
LIMIT 10; 