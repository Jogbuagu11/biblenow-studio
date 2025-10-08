-- Fix the weekly streaming limit check function to use the renamed table
CREATE OR REPLACE FUNCTION public.check_weekly_streaming_limit(user_id_param UUID)
RETURNS TABLE (
    has_reached_limit BOOLEAN,
    current_minutes INTEGER,
    limit_minutes INTEGER,
    remaining_minutes INTEGER,
    usage_percentage NUMERIC
) AS $$
DECLARE
    user_plan VARCHAR(50);
    plan_limit INTEGER;
    current_usage INTEGER;
    week_start_date DATE;
BEGIN
    -- Get the start of the current week (Monday)
    week_start_date := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Get user's subscription plan and limit
    SELECT subscription_plan INTO user_plan
    FROM public.verified_profiles
    WHERE id = user_id_param;
    
    -- Set streaming limit based on plan
    CASE user_plan
        WHEN 'free' THEN plan_limit := 60; -- 1 hour per week
        WHEN 'basic' THEN plan_limit := 300; -- 5 hours per week
        WHEN 'pro' THEN plan_limit := 1200; -- 20 hours per week
        WHEN 'enterprise' THEN plan_limit := 3000; -- 50 hours per week
        ELSE plan_limit := 60; -- Default to free plan limit
    END CASE;
    
    -- Get current week's usage
    SELECT COALESCE(streamed_minutes, 0) INTO current_usage
    FROM public.livestream_weekly_usage -- Updated table name here
    WHERE user_id = user_id_param 
    AND week_start_date = week_start_date;
    
    -- Calculate remaining minutes and usage percentage
    IF plan_limit = 0 THEN
        -- Avoid division by zero
        RETURN QUERY SELECT 
            TRUE as has_reached_limit,
            current_usage as current_minutes,
            plan_limit as limit_minutes,
            0 as remaining_minutes,
            100::NUMERIC as usage_percentage;
    ELSE
        RETURN QUERY SELECT 
            current_usage >= plan_limit as has_reached_limit,
            current_usage as current_minutes,
            plan_limit as limit_minutes,
            GREATEST(0, plan_limit - current_usage) as remaining_minutes,
            LEAST(100, (current_usage::NUMERIC / plan_limit::NUMERIC * 100)::NUMERIC) as usage_percentage;
    END IF;
END;
$$ LANGUAGE plpgsql;
