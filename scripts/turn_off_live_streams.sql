-- Turn off all live streams
-- Run this in your Supabase SQL Editor to turn off all currently live streams

-- First, let's see how many live streams we have
SELECT COUNT(*) as live_stream_count 
FROM public.livestreams 
WHERE is_live = true;

-- Show the live streams before turning them off
SELECT id, title, streamer_id, started_at, is_live, status
FROM public.livestreams 
WHERE is_live = true
ORDER BY started_at DESC;

-- Turn off all live streams
UPDATE public.livestreams 
SET is_live = false,
    ended_at = COALESCE(ended_at, NOW()),
    status = 'ended',
    updated_at = NOW()
WHERE is_live = true;

-- Verify the change
SELECT COUNT(*) as remaining_live_streams 
FROM public.livestreams 
WHERE is_live = true;

-- Show the recently ended streams
SELECT id, title, streamer_id, started_at, ended_at, status
FROM public.livestreams 
WHERE ended_at >= NOW() - INTERVAL '1 hour'
ORDER BY ended_at DESC; 