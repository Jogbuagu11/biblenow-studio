-- Mark all active streams as ended
-- Run this in your Supabase SQL Editor

-- 1. First, let's see what streams are currently active
SELECT 
    'Current active streams' as step,
    COUNT(*) as active_stream_count
FROM public.livestreams 
WHERE status != 'ended' OR status IS NULL;

-- Show details of active streams
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
WHERE status != 'ended' OR status IS NULL
ORDER BY started_at DESC;

-- 2. Update all streams that don't have 'ended' status to 'ended'
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

-- 3. Verify the update
SELECT 
    'After marking streams as ended' as step,
    COUNT(*) as total_streams,
    COUNT(CASE WHEN status = 'ended' THEN 1 END) as ended_streams,
    COUNT(CASE WHEN status != 'ended' THEN 1 END) as non_ended_streams
FROM public.livestreams;

-- 4. Show updated streams
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

-- 5. Check if weekly_usage was updated by triggers
SELECT 
    'Weekly usage after marking streams ended' as step,
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