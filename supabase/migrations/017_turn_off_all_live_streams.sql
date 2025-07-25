-- Turn off all live streams
-- This migration will set all currently live streams to ended status

UPDATE public.livestreams 
SET is_live = false,
    ended_at = COALESCE(ended_at, NOW()),
    status = 'ended',
    updated_at = NOW()
WHERE is_live = true;

-- Log how many streams were affected
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RAISE NOTICE 'Turned off % live streams', affected_count;
END $$; 