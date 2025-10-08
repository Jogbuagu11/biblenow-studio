-- Debug script to check why streams aren't showing on /streams page
-- Run this in your Supabase SQL Editor

-- 1. Check total livestreams count
SELECT 
    'Total livestreams' as check_type,
    COUNT(*) as count
FROM public.livestreams;

-- 2. Check livestreams by status
SELECT 
    'Livestreams by status' as check_type,
    status,
    COUNT(*) as count
FROM public.livestreams
GROUP BY status
ORDER BY count DESC;

-- 3. Check recent streams (ended streams)
SELECT 
    'Recent streams (ended)' as check_type,
    COUNT(*) as count
FROM public.livestreams
WHERE is_live = false 
AND ended_at IS NOT NULL;

-- 4. Check scheduled streams (future streams)
SELECT 
    'Scheduled streams (future)' as check_type,
    COUNT(*) as count
FROM public.livestreams
WHERE is_live = false 
AND scheduled_at >= NOW();

-- 5. Check streams with streamer_id
SELECT 
    'Streams with streamer_id' as check_type,
    COUNT(*) as count
FROM public.livestreams
WHERE streamer_id IS NOT NULL;

-- 6. Sample recent streams data
SELECT 
    'Sample recent streams' as check_type,
    id,
    title,
    streamer_id,
    is_live,
    status,
    started_at,
    ended_at,
    scheduled_at,
    updated_at
FROM public.livestreams
WHERE is_live = false 
AND ended_at IS NOT NULL
ORDER BY ended_at DESC
LIMIT 5;

-- 7. Sample scheduled streams data
SELECT 
    'Sample scheduled streams' as check_type,
    id,
    title,
    streamer_id,
    is_live,
    status,
    started_at,
    ended_at,
    scheduled_at,
    updated_at
FROM public.livestreams
WHERE is_live = false 
AND scheduled_at >= NOW()
ORDER BY scheduled_at ASC
LIMIT 5;

-- 8. Check for any streams without streamer_id
SELECT 
    'Streams without streamer_id' as check_type,
    COUNT(*) as count
FROM public.livestreams
WHERE streamer_id IS NULL;

-- 9. Check user authentication context
SELECT 
    'Current user context' as check_type,
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- 10. Test RLS policies by trying to select streams
SELECT 
    'RLS test - accessible streams' as check_type,
    COUNT(*) as accessible_count
FROM public.livestreams;
