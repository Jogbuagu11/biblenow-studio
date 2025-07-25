-- Remove the endstream trigger that's not working
-- Run this in your Supabase SQL Editor

-- 1. Remove the trigger
DROP TRIGGER IF EXISTS trigger_endstream_redirect ON public.livestreams;

-- 2. Remove the function
DROP FUNCTION IF EXISTS handle_endstream_redirect();

-- 3. Remove the manual function too
DROP FUNCTION IF EXISTS end_stream_by_id(UUID);

-- 4. Verify the trigger is gone
SELECT 
    trigger_name,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'livestreams'
AND trigger_schema = 'public'; 