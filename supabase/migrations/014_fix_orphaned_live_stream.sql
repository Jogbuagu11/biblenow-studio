-- Fix all orphaned live streams by setting is_live to false
UPDATE public.livestreams 
SET is_live = false, 
    ended_at = COALESCE(ended_at, NOW())
WHERE is_live = true; 