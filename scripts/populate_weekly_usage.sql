-- Manually populate weekly_usage table with existing livestream data
-- Run this in your Supabase SQL Editor

-- 1. Clear existing weekly usage data (optional - comment out if you want to keep existing data)
-- DELETE FROM public.weekly_usage;

-- 2. Insert weekly usage records for all completed streams from the current week
INSERT INTO public.weekly_usage (user_id, week_start_date, streamed_minutes, updated_at)
SELECT 
    streamer_id,
    DATE_TRUNC('week', started_at)::DATE as week_start_date,
    SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60) as streamed_minutes,
    NOW() as updated_at
FROM public.livestreams 
WHERE status = 'ended'
AND started_at IS NOT NULL 
AND ended_at IS NOT NULL
AND started_at >= DATE_TRUNC('week', CURRENT_DATE)
AND started_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
GROUP BY streamer_id, DATE_TRUNC('week', started_at)::DATE
ON CONFLICT (user_id, week_start_date)
DO UPDATE SET 
    streamed_minutes = EXCLUDED.streamed_minutes,
    updated_at = NOW();

-- 3. Also populate for the previous week (optional)
INSERT INTO public.weekly_usage (user_id, week_start_date, streamed_minutes, updated_at)
SELECT 
    streamer_id,
    DATE_TRUNC('week', started_at)::DATE as week_start_date,
    SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60) as streamed_minutes,
    NOW() as updated_at
FROM public.livestreams 
WHERE status = 'ended'
AND started_at IS NOT NULL 
AND ended_at IS NOT NULL
AND started_at >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days'
AND started_at < DATE_TRUNC('week', CURRENT_DATE)
GROUP BY streamer_id, DATE_TRUNC('week', started_at)::DATE
ON CONFLICT (user_id, week_start_date)
DO UPDATE SET 
    streamed_minutes = EXCLUDED.streamed_minutes,
    updated_at = NOW();

-- 4. Show the results
SELECT 
    wu.user_id,
    vp.email,
    wu.week_start_date,
    wu.streamed_minutes,
    wu.updated_at
FROM public.weekly_usage wu
JOIN public.verified_profiles vp ON wu.user_id = vp.id
ORDER BY wu.week_start_date DESC, wu.streamed_minutes DESC;

-- 5. Show summary
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(streamed_minutes) as total_minutes,
    AVG(streamed_minutes) as avg_minutes_per_user
FROM public.weekly_usage; 