-- Test Weekly Usage Recording (SQL version)
-- Run this in your Supabase SQL Editor

-- 1. Check current weekly usage data
SELECT 
    'Current weekly usage data' as test_step,
    COUNT(*) as record_count
FROM public.livestream_weekly_usage;

-- Show detailed weekly usage records
SELECT 
    wu.user_id,
    vp.email,
    wu.week_start_date,
    wu.streamed_minutes,
    wu.updated_at
FROM public.livestream_weekly_usage wu
JOIN public.verified_profiles vp ON wu.user_id = vp.id
ORDER BY wu.week_start_date DESC, wu.streamed_minutes DESC;

-- 2. Check recent livestreams
SELECT 
    'Recent livestreams' as test_step,
    COUNT(*) as stream_count
FROM public.livestreams 
WHERE started_at >= CURRENT_DATE - INTERVAL '7 days';

-- Show recent livestreams details
SELECT 
    id,
    title,
    streamer_id,
    started_at,
    ended_at,
    status,
    CASE 
        WHEN started_at IS NOT NULL AND ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
        ELSE 0 
    END as duration_minutes
FROM public.livestreams 
ORDER BY started_at DESC
LIMIT 10;

-- 3. Check if triggers exist
SELECT 
    'Triggers on livestreams table' as test_step,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'livestreams';

-- 4. Check if functions exist
SELECT 
    'Functions for weekly usage' as test_step,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('update_weekly_usage_on_stream_end', 'initialize_weekly_usage_for_existing_streams');

-- 5. Check current week calculation
SELECT 
    'Current week calculation' as test_step,
    CURRENT_DATE as current_date,
    EXTRACT(DOW FROM CURRENT_DATE) as day_of_week,
    DATE_TRUNC('week', CURRENT_DATE)::DATE as start_of_week,
    DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days' as end_of_week;

-- 6. Test weekly usage calculation for current week
SELECT 
    'Weekly usage for current week' as test_step,
    streamer_id,
    vp.email,
    DATE_TRUNC('week', started_at)::DATE as week_start_date,
    SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60) as calculated_minutes
FROM public.livestreams l
JOIN public.verified_profiles vp ON l.streamer_id = vp.id
WHERE l.status = 'ended'
AND l.started_at IS NOT NULL 
AND l.ended_at IS NOT NULL
AND l.started_at >= DATE_TRUNC('week', CURRENT_DATE)
AND l.started_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
GROUP BY streamer_id, vp.email, DATE_TRUNC('week', started_at)::DATE
ORDER BY calculated_minutes DESC;

-- 7. Compare calculated vs stored weekly usage
SELECT 
    'Comparison: Calculated vs Stored' as test_step,
    l.streamer_id,
    vp.email,
    DATE_TRUNC('week', l.started_at)::DATE as week_start_date,
    SUM(EXTRACT(EPOCH FROM (l.ended_at - l.started_at)) / 60) as calculated_minutes,
    wu.streamed_minutes as stored_minutes,
    CASE 
        WHEN wu.streamed_minutes IS NULL THEN 'Missing from livestream_weekly_usage table'
        WHEN SUM(EXTRACT(EPOCH FROM (l.ended_at - l.started_at)) / 60) = wu.streamed_minutes THEN 'Match'
        ELSE 'Mismatch'
    END as status
FROM public.livestreams l
JOIN public.verified_profiles vp ON l.streamer_id = vp.id
LEFT JOIN public.livestream_weekly_usage wu ON l.streamer_id = wu.user_id 
    AND DATE_TRUNC('week', l.started_at)::DATE = wu.week_start_date
WHERE l.status = 'ended'
AND l.started_at IS NOT NULL 
AND l.ended_at IS NOT NULL
AND l.started_at >= DATE_TRUNC('week', CURRENT_DATE)
AND l.started_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
GROUP BY l.streamer_id, vp.email, DATE_TRUNC('week', l.started_at)::DATE, wu.streamed_minutes
ORDER BY calculated_minutes DESC; 