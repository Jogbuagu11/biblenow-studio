-- Fix the notification functions to include the required title column

-- Update the streaming_add_minutes function to include title
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
    INSERT INTO livestream_weekly_usage (user_id, week_start_date, minutes_streamed)
    VALUES (user_id_param, week_start, minutes_to_add)
    ON CONFLICT (user_id, week_start_date)
    DO UPDATE SET 
        minutes_streamed = livestream_weekly_usage.minutes_streamed + minutes_to_add,
        updated_at = NOW();
    
    -- Check if user has reached their limit
    IF (current_usage + minutes_to_add) >= user_limit THEN
        -- Insert notification for streaming limit reached with title
        INSERT INTO studio_notifications (user_id, type, title, message, metadata)
        VALUES (
            user_id_param,
            'streaming_limit_reached',
            'Weekly Streaming Limit Reached',
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

-- Update the streaming_notify_limit_status function to include title
CREATE OR REPLACE FUNCTION streaming_notify_limit_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_limit integer;
    current_usage integer;
BEGIN
    -- Get user's streaming limit
    user_limit := streaming_get_user_limit(NEW.user_id);
    
    -- Get current usage for the week
    current_usage := streaming_get_weekly_usage(NEW.user_id);
    
    -- Check if user has reached their limit
    IF current_usage >= user_limit THEN
        -- Insert notification for streaming limit reached with title
        INSERT INTO studio_notifications (user_id, type, title, message, metadata)
        VALUES (
            NEW.user_id,
            'streaming_limit_reached',
            'Weekly Streaming Limit Reached',
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

-- Test the updated function
SELECT 'Testing updated streaming_add_minutes function:' as test_name;
SELECT streaming_add_minutes('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid, 10);

-- Check if notification was created successfully
SELECT 'Checking for notifications:' as test_name;
SELECT 
    id,
    user_id,
    type,
    title,
    message,
    metadata,
    created_at
FROM studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid
AND type = 'streaming_limit_reached'
ORDER BY created_at DESC
LIMIT 5;
