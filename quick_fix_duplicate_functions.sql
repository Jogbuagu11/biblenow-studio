-- Quick fix for duplicate function issue
-- This will resolve the "function get_weekly_streaming_usage(uuid) is not unique" error

-- Drop all variations of the problematic function
DROP FUNCTION IF EXISTS get_weekly_streaming_usage(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_weekly_streaming_usage(user_id_param uuid) CASCADE;
DROP FUNCTION IF EXISTS get_weekly_streaming_usage(p_user_id uuid) CASCADE;
DROP FUNCTION IF EXISTS get_weekly_streaming_usage(user_id_param uuid, week_start_date date) CASCADE;
DROP FUNCTION IF EXISTS get_weekly_streaming_usage(p_user_id uuid, week_start_date date) CASCADE;

-- Recreate with a single, unique signature
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
    SELECT COALESCE(SUM(streamed_minutes), 0)
    INTO usage_minutes
    FROM livestream_weekly_usage
    WHERE user_id = user_id_param
    AND week_start_date = week_start;
    
    RETURN COALESCE(usage_minutes, 0);
END;
$$;
