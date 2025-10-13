-- Clean up duplicate functions that are causing conflicts
-- This script removes all existing functions before recreating them

-- Drop all existing functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS get_user_streaming_limit(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_weekly_streaming_usage(uuid) CASCADE;
DROP FUNCTION IF EXISTS add_streaming_minutes(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS notify_streaming_limit_status() CASCADE;
DROP FUNCTION IF EXISTS sync_livestream_weekly_usage() CASCADE;
DROP FUNCTION IF EXISTS trigger_sync_livestream_weekly_usage() CASCADE;

-- Drop triggers that depend on these functions
DROP TRIGGER IF EXISTS notify_streaming_limit_status_trigger ON livestream_weekly_usage;
DROP TRIGGER IF EXISTS livestream_update_sync_trigger ON livestreams;

-- Now recreate the functions with proper signatures
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

-- Create sync function
CREATE OR REPLACE FUNCTION sync_livestream_weekly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    week_start date;
    stream_record record;
    total_minutes integer;
BEGIN
    -- Calculate start of current week (Monday)
    week_start := date_trunc('week', CURRENT_DATE)::date;
    
    -- Loop through all users who have livestreams this week
    FOR stream_record IN
        SELECT 
            user_id,
            SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)::integer as total_minutes
        FROM livestreams
        WHERE started_at >= week_start
        AND started_at < week_start + INTERVAL '7 days'
        AND ended_at IS NOT NULL
        GROUP BY user_id
    LOOP
        -- Insert or update weekly usage
        INSERT INTO livestream_weekly_usage (user_id, week_start_date, minutes_streamed)
        VALUES (stream_record.user_id, week_start, stream_record.total_minutes)
        ON CONFLICT (user_id, week_start_date)
        DO UPDATE SET 
            minutes_streamed = stream_record.total_minutes,
            updated_at = NOW();
    END LOOP;
END;
$$;

-- Create trigger function for auto-sync
CREATE OR REPLACE FUNCTION trigger_sync_livestream_weekly_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Call sync function when livestreams are updated
    PERFORM sync_livestream_weekly_usage();
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create auto-sync trigger
CREATE TRIGGER livestream_update_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON livestreams
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_livestream_weekly_usage();

-- Verify functions were created successfully
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_user_streaming_limit',
    'get_weekly_streaming_usage', 
    'add_streaming_minutes',
    'notify_streaming_limit_status',
    'sync_livestream_weekly_usage',
    'trigger_sync_livestream_weekly_usage'
)
ORDER BY routine_name;
