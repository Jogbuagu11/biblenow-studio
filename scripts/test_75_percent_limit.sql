-- First, verify settings
SELECT * FROM public.studio_settings;

-- Clear existing data and insert test usage
DO $$
DECLARE
    current_week_start DATE := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    streamer_id UUID := '29a4414e-d60f-42c1-bbfd-9166f17211a0';
    usage_minutes INTEGER := 900;  -- 75% of 1200 minutes
    limit_check RECORD;
BEGIN
    -- Clear existing usage data
    DELETE FROM public.livestream_weekly_usage 
    WHERE user_id = streamer_id 
    AND week_start_date = current_week_start;

    -- Clear existing notifications
    DELETE FROM public.studio_notifications
    WHERE user_id = streamer_id
    AND type IN ('streaming_limit_warning', 'streaming_limit_reached');

    -- Log the cleanup
    RAISE NOTICE 'Cleared existing data for user: %', streamer_id;

    -- Insert usage record
    INSERT INTO public.livestream_weekly_usage (
        user_id,
        week_start_date,
        streamed_minutes,
        created_at,
        updated_at
    ) VALUES (
        streamer_id,
        current_week_start,
        usage_minutes,
        NOW(),
        NOW()
    );

    -- Get streaming limit check results
    SELECT * INTO limit_check FROM public.check_weekly_streaming_limit(streamer_id);

    -- Log the results
    RAISE NOTICE 'Inserted test streaming usage:';
    RAISE NOTICE 'User ID: %', streamer_id;
    RAISE NOTICE 'Week Start: %', current_week_start;
    RAISE NOTICE 'Usage Minutes: % (% hours)', usage_minutes, usage_minutes / 60;
    RAISE NOTICE 'Usage Percentage: %', limit_check.usage_percentage;
    RAISE NOTICE 'Has Reached Limit: %', limit_check.has_reached_limit;
    RAISE NOTICE 'Remaining Minutes: % (% hours)', limit_check.remaining_minutes, limit_check.remaining_minutes / 60;
END $$;

-- Show the current usage
SELECT 
    lw.*,
    vp.subscription_plan,
    sp.streaming_minutes_limit,
    ROUND((lw.streamed_minutes::NUMERIC / sp.streaming_minutes_limit::NUMERIC) * 100, 1) as usage_percentage
FROM public.livestream_weekly_usage lw
JOIN public.verified_profiles vp ON lw.user_id = vp.id
JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
WHERE lw.user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND lw.week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;

-- Show the streaming limit check results
SELECT * FROM public.check_weekly_streaming_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0');

-- Show notifications with edge function responses
SELECT 
    type,
    title,
    body,
    created_at,
    metadata->>'edge_function_status' as edge_function_status,
    metadata->>'edge_function_response' as edge_function_response
FROM public.studio_notifications
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;