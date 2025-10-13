-- Fix the duplicate get_weekly_streaming_usage functions
-- Drop the specific duplicate functions found

DROP FUNCTION IF EXISTS get_weekly_streaming_usage(user_id_param uuid, week_start_date date) CASCADE;
DROP FUNCTION IF EXISTS get_weekly_streaming_usage(p_user_id uuid) CASCADE;

-- Now recreate the correct function with the proper signature
CREATE OR REPLACE FUNCTION get_weekly_streaming_usage(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    usage_minutes integer;
    week_start date;
BEGIN
    -- Calculate start of current week (Monday)
    week_start := date_trunc('week', CURRENT_DATE)::date;
    
    -- Get total streaming minutes for current week
    SELECT COALESCE(SUM(minutes_streamed), 0)
    INTO usage_minutes
    FROM livestream_weekly_usage
    WHERE user_id = user_id_param
    AND week_start_date = week_start;
    
    RETURN COALESCE(usage_minutes, 0);
END;
$$;

-- Verify the function was created correctly
SELECT 
    routine_name,
    routine_type,
    data_type,
    created
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_weekly_streaming_usage'
ORDER BY created DESC;

-- Test the function
SELECT 'Testing get_weekly_streaming_usage function:' as test_name;
SELECT get_weekly_streaming_usage('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as current_usage;
