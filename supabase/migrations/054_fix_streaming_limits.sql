-- Fix streaming limits to use subscription_plans table
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
    
    -- Get user's subscription plan
    SELECT subscription_plan INTO user_plan
    FROM public.verified_profiles
    WHERE id = user_id_param;

    -- Set streaming limit based on plan (in minutes)
    CASE user_plan
        WHEN 'Free' THEN plan_limit := 0; -- No streaming
        WHEN 'Olive' THEN plan_limit := 180; -- 3 hours per week
        WHEN 'Branch' THEN plan_limit := 360; -- 6 hours per week
        WHEN 'Vine' THEN plan_limit := 600; -- 10 hours per week
        WHEN 'Cedar' THEN plan_limit := 1200; -- 20 hours per week
        ELSE plan_limit := 0; -- Default to no streaming
    END CASE;
    
    -- Get current week's usage
    SELECT COALESCE(streamed_minutes, 0) INTO current_usage
    FROM public.livestream_weekly_usage
    WHERE user_id = user_id_param 
    AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Calculate remaining minutes and usage percentage
    IF plan_limit = 0 THEN
        -- Free plan or unknown plan (no streaming allowed)
        RETURN QUERY SELECT 
            TRUE as has_reached_limit,
            COALESCE(current_usage, 0) as current_minutes,
            0 as limit_minutes,
            0 as remaining_minutes,
            100.0 as usage_percentage;
    ELSE
        -- Paid plans with streaming limits
        RETURN QUERY SELECT 
            COALESCE(current_usage, 0) >= plan_limit as has_reached_limit,
            COALESCE(current_usage, 0) as current_minutes,
            plan_limit as limit_minutes,
            GREATEST(0, plan_limit - COALESCE(current_usage, 0)) as remaining_minutes,
            LEAST(100, (COALESCE(current_usage, 0)::NUMERIC / plan_limit::NUMERIC * 100)) as usage_percentage;
    END IF;
END;
$$ LANGUAGE plpgsql;