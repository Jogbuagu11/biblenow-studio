-- Fix the check_weekly_streaming_limit function to properly handle subscription_plan_id
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
    current_week_start DATE;
BEGIN
    -- Get the start of the current week (Monday)
    current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Get user's streaming limit from subscription plan using subscription_plan_id
    SELECT COALESCE(sp.streaming_minutes_limit, 0) INTO plan_limit
    FROM public.verified_profiles vp
    LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE vp.id = user_id_param;

    -- Log the values for debugging
    RAISE NOTICE 'User ID: %, Plan Limit: %', user_id_param, plan_limit;
    
    -- Get current week's usage
    SELECT COALESCE(streamed_minutes, 0) INTO current_usage
    FROM public.livestream_weekly_usage lw
    WHERE lw.user_id = user_id_param 
    AND lw.week_start_date = current_week_start;

    -- Log the usage for debugging
    RAISE NOTICE 'Current Usage: %, Week Start: %', current_usage, current_week_start;
    
    -- Calculate remaining minutes and usage percentage
    RETURN QUERY 
    SELECT 
        CASE 
            WHEN plan_limit = 0 THEN true  -- No streaming allowed if no plan limit
            ELSE current_usage >= plan_limit -- Normal limit check
        END AS has_reached_limit,
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

-- Add debugging query to verify subscription plan linkage
SELECT 
    vp.id,
    vp.email,
    vp.subscription_plan,
    vp.subscription_plan_id,
    sp.name as plan_name,
    sp.streaming_minutes_limit,
    cwsl.limit_minutes,
    cwsl.current_minutes,
    cwsl.remaining_minutes,
    cwsl.usage_percentage
FROM public.verified_profiles vp
LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
CROSS JOIN LATERAL public.check_weekly_streaming_limit(vp.id) cwsl
WHERE vp.subscription_plan = 'Cedar'
OR sp.name = 'Cedar';
