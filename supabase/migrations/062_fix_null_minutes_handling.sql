-- Fix the check_weekly_streaming_limit function to properly handle NULL values
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

    -- Default to 0 if no plan limit found
    IF plan_limit IS NULL THEN
        plan_limit := 0;
    END IF;
    
    -- Get current week's usage, defaulting to 0 if no record exists
    SELECT COALESCE(lw.streamed_minutes, 0) INTO current_usage
    FROM (SELECT user_id_param as user_id, current_week_start as week_start) params
    LEFT JOIN public.livestream_weekly_usage lw 
        ON lw.user_id = params.user_id 
        AND lw.week_start_date = params.week_start;

    -- Ensure current_usage is never NULL
    current_usage := COALESCE(current_usage, 0);
    
    -- Calculate remaining minutes and usage percentage
    RETURN QUERY 
    SELECT 
        CASE 
            WHEN plan_limit <= 0 THEN true  -- No streaming allowed if no plan limit
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

    -- Log the values for debugging
    RAISE NOTICE 'User ID: %, Plan Limit: %, Current Usage: %, Week Start: %', 
        user_id_param, plan_limit, current_usage, current_week_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function with the Cedar user
SELECT * FROM check_weekly_streaming_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0');

-- Verify weekly usage records
SELECT * FROM public.livestream_weekly_usage 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND week_start_date >= DATE_TRUNC('week', CURRENT_DATE)::DATE;
