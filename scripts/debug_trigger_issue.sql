-- Debug why the trigger isn't creating notifications

-- 1. Check if trigger exists and is enabled
SELECT 
    'Trigger Status' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    action_condition,
    action_orientation
FROM information_schema.triggers 
WHERE trigger_name = 'notify_streaming_limit_status_trigger'
AND event_object_table = 'livestream_weekly_usage';

-- 2. Check if the trigger function exists
SELECT 
    'Function Status' as check_type,
    proname as function_name,
    prosrc as function_body_preview
FROM pg_proc 
WHERE proname = 'notify_streaming_limit_status';

-- 3. Check recent usage data
SELECT 
    'Recent Usage Data' as check_type,
    user_id,
    week_start_date,
    streamed_minutes,
    created_at,
    updated_at
FROM public.livestream_weekly_usage 
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- 4. Check user profile and subscription plan
SELECT 
    'User Profile Check' as check_type,
    p.id,
    p.email,
    p.first_name,
    p.subscription_plan_id,
    sp.name as plan_name,
    sp.streaming_minutes_limit
FROM public.profiles p
LEFT JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
WHERE p.id IN (
    SELECT DISTINCT user_id 
    FROM public.livestream_weekly_usage 
    WHERE created_at > NOW() - INTERVAL '10 minutes'
);

-- 5. Manually test the trigger function logic
DO $$
DECLARE
    test_user_id UUID;
    user_limit INTEGER;
    current_usage INTEGER;
    usage_percentage NUMERIC;
    user_profile RECORD;
    next_week_start DATE;
BEGIN
    -- Get the most recent user from usage data
    SELECT user_id INTO test_user_id
    FROM public.livestream_weekly_usage 
    WHERE created_at > NOW() - INTERVAL '10 minutes'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No recent usage data found for testing';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing trigger logic for user: %', test_user_id;
    
    -- Get user's streaming limit and profile info (same logic as trigger)
    SELECT 
        sp.streaming_minutes_limit,
        p.email,
        p.first_name
    INTO user_profile
    FROM public.profiles p
    JOIN public.subscription_plans sp ON p.subscription_plan_id = sp.id
    WHERE p.id = test_user_id;

    IF user_profile IS NULL THEN
        RAISE NOTICE 'User profile not found for user %', test_user_id;
        RETURN;
    END IF;

    user_limit := user_profile.streaming_minutes_limit;
    RAISE NOTICE 'User limit: % minutes', user_limit;

    -- Get current week's usage
    SELECT COALESCE(SUM(streamed_minutes), 0) INTO current_usage
    FROM public.livestream_weekly_usage
    WHERE user_id = test_user_id
    AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;

    RAISE NOTICE 'Current usage: % minutes', current_usage;

    -- Calculate percentage
    IF user_limit > 0 THEN
        usage_percentage := (current_usage::NUMERIC / user_limit::NUMERIC) * 100;
    ELSE
        usage_percentage := 0;
    END IF;

    RAISE NOTICE 'Usage percentage: %', ROUND(usage_percentage, 1);

    -- Check if we should create notifications
    IF usage_percentage >= 75 AND usage_percentage < 100 THEN
        RAISE NOTICE 'Should create 75 percent warning notification';
        
        -- Check if notification already exists
        IF EXISTS (
            SELECT 1 FROM public.studio_notifications 
            WHERE user_id = test_user_id 
            AND type = 'streaming_limit_warning'
            AND created_at >= DATE_TRUNC('week', CURRENT_DATE)
        ) THEN
            RAISE NOTICE 'Warning notification already exists for this week';
        ELSE
            RAISE NOTICE 'No existing warning notification found - should create one';
        END IF;
    ELSIF usage_percentage >= 100 THEN
        RAISE NOTICE 'Should create 100 percent limit reached notification';
    ELSE
        RAISE NOTICE 'Usage percentage (%) is below 75 percent - no notification needed', ROUND(usage_percentage, 1);
    END IF;

END $$;

-- 6. Check all notifications for debugging
SELECT 
    'All Notifications' as check_type,
    id,
    user_id,
    type,
    title,
    created_at,
    metadata->>'usage_percentage' as usage_pct
FROM public.studio_notifications 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
