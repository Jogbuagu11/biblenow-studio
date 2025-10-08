-- Fix the streaming limit notification trigger to remove email service call
CREATE OR REPLACE FUNCTION notify_streaming_limit_status()
RETURNS TRIGGER AS $$
DECLARE
    user_limit INTEGER;
    current_usage INTEGER;
    usage_percentage NUMERIC;
    user_profile RECORD;
BEGIN
    -- Get user's streaming limit
    SELECT sp.streaming_minutes_limit INTO user_limit
    FROM public.verified_profiles vp
    JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE vp.id = NEW.user_id;

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

    -- Log the check for debugging
    RAISE NOTICE 'Streaming limit check - User: %, Current Usage: %, Limit: %, Usage Percentage: %', 
        NEW.user_id, 
        current_usage, 
        user_limit, 
        ROUND(usage_percentage, 1);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;