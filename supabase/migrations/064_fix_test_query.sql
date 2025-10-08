-- Fix the check_weekly_streaming_limit function with corrected test query
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
    user_plan_record RECORD;
BEGIN
    -- Get the start of the current week (Monday)
    current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Get user's plan details
    SELECT 
        vp.subscription_plan_id,
        sp.streaming_minutes_limit,
        sp.name as plan_name
    INTO user_plan_record
    FROM public.verified_profiles vp
    LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE vp.id = user_id_param;

    -- Log plan details for debugging
    RAISE NOTICE 'User plan details - ID: %, Name: %, Limit: %', 
        user_plan_record.subscription_plan_id,
        user_plan_record.plan_name,
        user_plan_record.streaming_minutes_limit;

    -- Set plan limit, defaulting to 0 if no valid plan found
    plan_limit := COALESCE(user_plan_record.streaming_minutes_limit, 0);
    
    -- Get current week's usage using a LEFT JOIN to handle no records
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test queries to verify dynamic plan handling
WITH distinct_plans AS (
    -- First get one user from each distinct plan limit
    SELECT DISTINCT ON (sp.streaming_minutes_limit)
        vp.id as user_id,
        vp.email,
        vp.subscription_plan,
        sp.name as plan_name,
        sp.streaming_minutes_limit
    FROM public.verified_profiles vp
    LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE sp.streaming_minutes_limit IS NOT NULL
    ORDER BY sp.streaming_minutes_limit, vp.created_at DESC
)
SELECT 
    dp.email,
    dp.subscription_plan,
    dp.plan_name,
    dp.streaming_minutes_limit as plan_limit_configured,
    cwsl.limit_minutes as limit_returned,
    cwsl.current_minutes,
    cwsl.remaining_minutes,
    cwsl.usage_percentage,
    CASE 
        WHEN dp.streaming_minutes_limit = cwsl.limit_minutes THEN 'OK'
        ELSE 'MISMATCH'
    END as limit_check
FROM distinct_plans dp
CROSS JOIN LATERAL check_weekly_streaming_limit(dp.user_id) cwsl
ORDER BY dp.streaming_minutes_limit;

-- Verify no hardcoded values in subscription_plans
SELECT 
    name,
    streaming_minutes_limit,
    price_usd,
    created_at
FROM public.subscription_plans
ORDER BY streaming_minutes_limit;
