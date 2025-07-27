-- Add test livestream with 35 minutes duration for mrs.ogbuagu@gmail.com
-- Run this in your Supabase SQL Editor

-- 1. First, let's check the current state
SELECT 
    'Current state before adding test stream' as step,
    COUNT(*) as total_livestreams,
    COUNT(CASE WHEN status = 'ended' THEN 1 END) as ended_streams
FROM public.livestreams;

-- 2. Add a test livestream that started 2 hours ago and ended 1 hour and 25 minutes ago (35 minutes duration)
INSERT INTO public.livestreams (
    id,
    streamer_id,
    title,
    description,
    is_live,
    started_at,
    ended_at,
    status,
    platform,
    stream_type,
    viewer_count,
    max_viewers,
    updated_at
) VALUES (
    gen_random_uuid(),
    '29a4414e-d60f-42c1-bbfd-9166f17211a0', -- mrs.ogbuagu@gmail.com user ID
    'Test Stream - 35 Minutes',
    'This is a test stream to verify weekly usage recording',
    false,
    NOW() - INTERVAL '2 hours', -- Started 2 hours ago
    NOW() - INTERVAL '1 hour 25 minutes', -- Ended 1 hour 25 minutes ago (35 minutes duration)
    'ended',
    'YouTube',
    'video',
    150,
    200,
    NOW()
);

-- 3. Check the livestream was added
SELECT 
    'Test livestream added' as step,
    id,
    title,
    streamer_id,
    started_at,
    ended_at,
    status,
    EXTRACT(EPOCH FROM (ended_at - started_at)) / 60 as duration_minutes
FROM public.livestreams 
WHERE title = 'Test Stream - 35 Minutes'
ORDER BY updated_at DESC
LIMIT 1;

-- 4. Check if the trigger automatically updated weekly_usage
SELECT 
    'Weekly usage after adding test stream' as step,
    wu.user_id,
    vp.email,
    wu.week_start_date,
    wu.streamed_minutes,
    wu.updated_at
FROM public.weekly_usage wu
JOIN public.verified_profiles vp ON wu.user_id = vp.id
WHERE vp.email = 'mrs.ogbuagu@gmail.com'
ORDER BY wu.week_start_date DESC;

-- 5. If the trigger didn't work, manually update weekly_usage
-- (This will only run if no weekly_usage record exists for this week)
INSERT INTO public.weekly_usage (user_id, week_start_date, streamed_minutes, updated_at)
SELECT 
    '29a4414e-d60f-42c1-bbfd-9166f17211a0',
    DATE_TRUNC('week', CURRENT_DATE)::DATE,
    35,
    NOW()
ON CONFLICT (user_id, week_start_date)
DO UPDATE SET 
    streamed_minutes = weekly_usage.streamed_minutes + 35,
    updated_at = NOW();

-- 6. Verify the final state
SELECT 
    'Final verification' as step,
    wu.user_id,
    vp.email,
    wu.week_start_date,
    wu.streamed_minutes,
    wu.updated_at
FROM public.weekly_usage wu
JOIN public.verified_profiles vp ON wu.user_id = vp.id
WHERE vp.email = 'mrs.ogbuagu@gmail.com'
ORDER BY wu.week_start_date DESC;

-- 7. Show all livestreams for this user
SELECT 
    'All livestreams for test user' as step,
    id,
    title,
    started_at,
    ended_at,
    status,
    EXTRACT(EPOCH FROM (ended_at - started_at)) / 60 as duration_minutes
FROM public.livestreams 
WHERE streamer_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
ORDER BY started_at DESC; 