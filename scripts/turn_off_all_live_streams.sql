-- Turn off all livestreams
-- Run this in your Supabase SQL Editor

-- 1. First, let's see what streams are currently live
SELECT 
    'Current live streams' as step,
    COUNT(*) as live_stream_count
FROM public.livestreams 
WHERE is_live = true;

-- Show details of live streams
SELECT 
    id,
    title,
    streamer_id,
    started_at,
    ended_at,
    status,
    is_live,
    updated_at
FROM public.livestreams 
WHERE is_live = true
ORDER BY started_at DESC;

-- 2. Turn off all live streams
UPDATE public.livestreams 
SET 
    is_live = false,
    status = 'ended',
    ended_at = CASE 
        WHEN ended_at IS NULL THEN NOW()
        ELSE ended_at
    END,
    updated_at = NOW()
WHERE is_live = true;

-- 3. Also mark any streams that aren't ended as ended
UPDATE public.livestreams 
SET 
    status = 'ended',
    is_live = false,
    ended_at = CASE 
        WHEN ended_at IS NULL THEN NOW()
        ELSE ended_at
    END,
    updated_at = NOW()
WHERE status != 'ended' OR status IS NULL;

-- 4. Verify all streams are now turned off
SELECT 
    'After turning off all streams' as step,
    COUNT(*) as total_streams,
    COUNT(CASE WHEN is_live = true THEN 1 END) as live_streams,
    COUNT(CASE WHEN is_live = false THEN 1 END) as non_live_streams,
    COUNT(CASE WHEN status = 'ended' THEN 1 END) as ended_streams,
    COUNT(CASE WHEN status != 'ended' THEN 1 END) as non_ended_streams
FROM public.livestreams;

-- 5. Show recent streams to confirm they're all turned off
SELECT 
    id,
    title,
    streamer_id,
    started_at,
    ended_at,
    status,
    is_live,
    updated_at,
    CASE 
        WHEN started_at IS NOT NULL AND ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
        ELSE 0 
    END as duration_minutes
FROM public.livestreams 
ORDER BY updated_at DESC
LIMIT 10;

-- 6. Check if weekly_usage was updated by triggers
SELECT 
    'Weekly usage after turning off streams' as step,
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