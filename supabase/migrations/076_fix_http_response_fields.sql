-- Update the trigger function with correct http_response field names
CREATE OR REPLACE FUNCTION notify_streaming_limit_status()
RETURNS TRIGGER AS $$
DECLARE
    user_limit INTEGER;
    current_usage INTEGER;
    usage_percentage NUMERIC;
    user_profile RECORD;
    next_week_start DATE;
    supabase_url TEXT;
    service_role_key TEXT;
    http_response RECORD;
BEGIN
    -- Get settings from the table
    SELECT value INTO supabase_url FROM public.studio_settings WHERE key = 'supabase_url';
    SELECT value INTO service_role_key FROM public.studio_settings WHERE key = 'service_role_key';

    -- Log the settings
    RAISE NOTICE 'Settings loaded - URL: %, Key present: %', 
        supabase_url, 
        CASE WHEN service_role_key IS NOT NULL THEN 'yes' ELSE 'no' END;

    -- Get user's streaming limit and profile info
    SELECT 
        sp.streaming_minutes_limit,
        vp.email,
        vp.first_name
    INTO user_profile
    FROM public.verified_profiles vp
    JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE vp.id = NEW.user_id;

    user_limit := user_profile.streaming_minutes_limit;

    -- Get current week's usage
    SELECT COALESCE(SUM(streamed_minutes), 0) INTO current_usage
    FROM public.livestream_weekly_usage
    WHERE user_id = NEW.user_id
    AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;

    -- Calculate percentage
    IF user_limit > 0 THEN
        usage_percentage := (current_usage::NUMERIC / user_limit::NUMERIC) * 100;
    ELSE
        usage_percentage := 0;
    END IF;

    -- Calculate next week's start date
    next_week_start := DATE_TRUNC('week', CURRENT_DATE + INTERVAL '7 days')::DATE;

    -- Log the check for debugging (split into multiple notices for clarity)
    RAISE NOTICE 'User check - ID: %, Email: %', NEW.user_id, user_profile.email;
    RAISE NOTICE 'Usage check - Current: %, Limit: %, Percentage: %', 
        current_usage, user_limit, ROUND(usage_percentage, 1);
    RAISE NOTICE 'Next reset date: %', next_week_start;

    -- Send notifications at thresholds
    IF usage_percentage >= 75 AND usage_percentage < 100 THEN
        -- Log attempt to send warning email
        RAISE NOTICE 'Sending warning email - User: %, Usage: %', 
            NEW.user_id, ROUND(usage_percentage, 1);

        -- Call edge function to send warning email
        SELECT * INTO http_response FROM net.http_post(
            url := CONCAT(supabase_url, '/functions/v1/send-streaming-limit-email'),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', CONCAT('Bearer ', service_role_key)
            ),
            body := jsonb_build_object(
                'user_id', NEW.user_id,
                'email', user_profile.email,
                'first_name', user_profile.first_name,
                'type', 'warning',
                'usage_percentage', ROUND(usage_percentage, 1),
                'remaining_minutes', user_limit - current_usage,
                'reset_date', next_week_start
            )::text
        );

        -- Log the response
        RAISE NOTICE 'Edge function response - Code: %, Body: %', 
            http_response.code, http_response.body;

        -- Insert warning notification with edge function response
        INSERT INTO public.studio_notifications (
            user_id,
            type,
            title,
            body,
            metadata,
            created_at
        ) VALUES (
            NEW.user_id,
            'streaming_limit_warning',
            'Approaching Weekly Streaming Limit',
            format('You have used %s%% of your weekly streaming limit (%s of %s minutes). Your limit will reset on %s.', 
                ROUND(usage_percentage, 1),
                current_usage,
                user_limit,
                next_week_start
            ),
            jsonb_build_object(
                'usage_percentage', ROUND(usage_percentage, 1),
                'current_minutes', current_usage,
                'limit_minutes', user_limit,
                'remaining_minutes', user_limit - current_usage,
                'reset_date', next_week_start,
                'edge_function_code', http_response.code,
                'edge_function_response', http_response.body
            ),
            NOW()
        );
    END IF;

    IF usage_percentage >= 100 THEN
        -- Log attempt to send limit reached email
        RAISE NOTICE 'Sending limit reached email - User: %', NEW.user_id;

        -- Call edge function
        SELECT * INTO http_response FROM net.http_post(
            url := CONCAT(supabase_url, '/functions/v1/send-streaming-limit-email'),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', CONCAT('Bearer ', service_role_key)
            ),
            body := jsonb_build_object(
                'user_id', NEW.user_id,
                'email', user_profile.email,
                'first_name', user_profile.first_name,
                'type', 'reached',
                'usage_percentage', ROUND(usage_percentage, 1),
                'remaining_minutes', 0,
                'reset_date', next_week_start
            )::text
        );

        -- Log the response
        RAISE NOTICE 'Edge function response - Code: %, Body: %', 
            http_response.code, http_response.body;

        -- Insert notification with edge function response
        INSERT INTO public.studio_notifications (
            user_id,
            type,
            title,
            body,
            metadata,
            created_at
        ) VALUES (
            NEW.user_id,
            'streaming_limit_reached',
            'Weekly Streaming Limit Reached',
            format('You have reached your weekly streaming limit. Your limit will reset on %s.', 
                next_week_start
            ),
            jsonb_build_object(
                'usage_percentage', ROUND(usage_percentage, 1),
                'current_minutes', current_usage,
                'limit_minutes', user_limit,
                'remaining_minutes', 0,
                'reset_date', next_week_start,
                'edge_function_code', http_response.code,
                'edge_function_response', http_response.body
            ),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
