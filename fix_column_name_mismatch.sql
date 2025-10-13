-- Fix the column name mismatch between our new table and existing functions
-- The existing functions expect 'streamed_minutes' but our table has 'minutes_streamed'

-- Option 1: Rename the column in our table to match existing functions
ALTER TABLE livestream_weekly_usage 
RENAME COLUMN minutes_streamed TO streamed_minutes;

-- Option 2: Update our functions to use the correct column name
CREATE OR REPLACE FUNCTION streaming_get_weekly_usage(user_id_param uuid)
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

CREATE OR REPLACE FUNCTION streaming_add_minutes(user_id_param uuid, minutes_to_add integer)
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
    current_usage := streaming_get_weekly_usage(user_id_param);
    
    -- Get user's streaming limit
    user_limit := streaming_get_user_limit(user_id_param);
    
    -- Insert or update weekly usage
    INSERT INTO livestream_weekly_usage (user_id, week_start_date, streamed_minutes)
    VALUES (user_id_param, week_start, minutes_to_add)
    ON CONFLICT (user_id, week_start_date)
    DO UPDATE SET 
        streamed_minutes = livestream_weekly_usage.streamed_minutes + minutes_to_add,
        updated_at = NOW();
    
    -- Check if user has reached their limit
    IF (current_usage + minutes_to_add) >= user_limit THEN
        -- Insert notification with required columns
        INSERT INTO studio_notifications (user_id, type, title, body, message, metadata)
        VALUES (
            user_id_param,
            'streaming_limit_reached',
            'Weekly Streaming Limit Reached',
            'You have reached your weekly streaming limit of ' || user_limit || ' minutes. Your limit will reset on Monday.',
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

-- Test the fixed functions
SELECT 'Testing fixed streaming_get_weekly_usage:' as test_name;
SELECT streaming_get_weekly_usage('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as current_usage;

SELECT 'Testing fixed streaming_add_minutes:' as test_name;
SELECT streaming_add_minutes('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid, 10);

-- Check the table structure
SELECT 'Updated table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'livestream_weekly_usage'
ORDER BY ordinal_position;
