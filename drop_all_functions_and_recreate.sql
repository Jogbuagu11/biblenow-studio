-- Drop ALL possible variations of the get_weekly_streaming_usage function
-- and then recreate it properly

-- Drop all possible function signatures
DROP FUNCTION IF EXISTS get_weekly_streaming_usage(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_weekly_streaming_usage(user_id_param uuid) CASCADE;
DROP FUNCTION IF EXISTS get_weekly_streaming_usage(p_user_id uuid) CASCADE;
DROP FUNCTION IF EXISTS get_weekly_streaming_usage(user_id_param uuid, week_start_date date) CASCADE;
DROP FUNCTION IF EXISTS get_weekly_streaming_usage(p_user_id uuid, week_start_date date) CASCADE;

-- Also drop any other related functions that might be causing issues
DROP FUNCTION IF EXISTS get_user_streaming_limit(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_streaming_limit(user_id_param uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_streaming_limit(p_user_id uuid) CASCADE;

DROP FUNCTION IF EXISTS add_streaming_minutes(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS add_streaming_minutes(user_id_param uuid, minutes_to_add integer) CASCADE;
DROP FUNCTION IF EXISTS add_streaming_minutes(p_user_id uuid, minutes_to_add integer) CASCADE;

DROP FUNCTION IF EXISTS notify_streaming_limit_status() CASCADE;

-- Drop triggers that depend on these functions
DROP TRIGGER IF EXISTS notify_streaming_limit_status_trigger ON livestream_weekly_usage;
DROP TRIGGER IF EXISTS livestream_update_sync_trigger ON livestreams;

-- Now recreate the functions with consistent parameter names
CREATE OR REPLACE FUNCTION get_user_streaming_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_limit integer;
BEGIN
    -- Get user's streaming limit from verified_profiles
    SELECT COALESCE(preferences->>'streamingLimitMinutes', '60')::integer
    INTO user_limit
    FROM verified_profiles
    WHERE id = user_id_param;
    
    -- Default to 60 minutes if not found
    RETURN COALESCE(user_limit, 60);
END;
$$;

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

CREATE OR REPLACE FUNCTION add_streaming_minutes(user_id_param uuid, minutes_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    week_start date;
    current_usage integer;
    user_limit integer;
BEGIN
    -- Calculate start of current week (Monday)
    week_start := date_trunc('week', CURRENT_DATE)::date;
    
    -- Get current usage for the week
    current_usage := get_weekly_streaming_usage(user_id_param);
    
    -- Get user's streaming limit
    user_limit := get_user_streaming_limit(user_id_param);
    
    -- Insert or update weekly usage
    INSERT INTO livestream_weekly_usage (user_id, week_start_date, minutes_streamed)
    VALUES (user_id_param, week_start, minutes_to_add)
    ON CONFLICT (user_id, week_start_date)
    DO UPDATE SET 
        minutes_streamed = livestream_weekly_usage.minutes_streamed + minutes_to_add,
        updated_at = NOW();
    
    -- Check if user has reached their limit
    IF (current_usage + minutes_to_add) >= user_limit THEN
        -- Insert notification for streaming limit reached
        INSERT INTO studio_notifications (user_id, type, message, metadata)
        VALUES (
            user_id_param,
            'streaming_limit_reached',
            'You have reached your weekly streaming limit',
            jsonb_build_object(
                'current_usage', current_usage + minutes_to_add,
                'limit', user_limit,
                'week_start', week_start
            )
        );
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION notify_streaming_limit_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_limit integer;
    current_usage integer;
BEGIN
    -- Get user's streaming limit
    user_limit := get_user_streaming_limit(NEW.user_id);
    
    -- Get current usage for the week
    current_usage := get_weekly_streaming_usage(NEW.user_id);
    
    -- Check if user has reached their limit
    IF current_usage >= user_limit THEN
        -- Insert notification for streaming limit reached
        INSERT INTO studio_notifications (user_id, type, message, metadata)
        VALUES (
            NEW.user_id,
            'streaming_limit_reached',
            'You have reached your weekly streaming limit',
            jsonb_build_object(
                'current_usage', current_usage,
                'limit', user_limit,
                'week_start', NEW.week_start_date
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER notify_streaming_limit_status_trigger
    AFTER INSERT OR UPDATE ON livestream_weekly_usage
    FOR EACH ROW
    EXECUTE FUNCTION notify_streaming_limit_status();

-- Verify all functions were created successfully
SELECT 
    routine_name,
    routine_type,
    data_type,
    created
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_user_streaming_limit',
    'get_weekly_streaming_usage', 
    'add_streaming_minutes',
    'notify_streaming_limit_status'
)
ORDER BY routine_name;

-- Test the functions
SELECT 'Testing functions:' as test_name;
SELECT get_user_streaming_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as streaming_limit;
SELECT get_weekly_streaming_usage('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as current_usage;
