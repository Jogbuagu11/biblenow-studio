-- Update the check_weekly_streaming_limit function to use subscription_plans table
CREATE OR REPLACE FUNCTION public.check_weekly_streaming_limit(user_id_param UUID)
RETURNS TABLE (
    has_reached_limit BOOLEAN,
    current_minutes INTEGER,
    limit_minutes INTEGER,
    remaining_minutes INTEGER,
    usage_percentage NUMERIC
) AS $$
DECLARE
    plan_limit INTEGER;
    current_usage INTEGER;
    week_start_date DATE;
BEGIN
    -- Get the start of the current week (Monday)
    week_start_date := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Get user's streaming limit from subscription plan
    SELECT sp.streaming_minutes_limit INTO plan_limit
    FROM public.verified_profiles vp
    LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE vp.id = user_id_param;

    -- If no plan found or limit is null, default to 0 (no streaming)
    IF plan_limit IS NULL THEN
        plan_limit := 0;
    END IF;
    
    -- Get current week's usage
    SELECT COALESCE(streamed_minutes, 0) INTO current_usage
    FROM public.livestream_weekly_usage
    WHERE user_id = user_id_param 
    AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;

    -- Default to 0 if no usage record found
    IF current_usage IS NULL THEN
        current_usage := 0;
    END IF;
    
    -- Calculate remaining minutes and usage percentage
    RETURN QUERY SELECT 
        current_usage >= plan_limit AS has_reached_limit,
        current_usage AS current_minutes,
        plan_limit AS limit_minutes,
        GREATEST(0, plan_limit - current_usage) AS remaining_minutes,
        CASE 
            WHEN plan_limit > 0 THEN 
                ROUND((current_usage::NUMERIC / plan_limit::NUMERIC) * 100, 1)
            ELSE 
                0
        END AS usage_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
