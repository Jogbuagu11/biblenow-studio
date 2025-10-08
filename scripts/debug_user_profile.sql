-- Debug the specific user profile and subscription setup

-- 1. Check what users exist in verified_profiles
SELECT 
    'All Verified Profiles' as check_type,
    id,
    email,
    first_name,
    subscription_plan_id,
    created_at
FROM public.verified_profiles
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check subscription plans
SELECT 
    'Subscription Plans' as check_type,
    id,
    name,
    streaming_minutes_limit,
    price_usd
FROM public.subscription_plans
ORDER BY name;

-- 3. Check recent usage data and which users it belongs to
SELECT 
    'Recent Usage with User Info' as check_type,
    lw.user_id,
    lw.streamed_minutes,
    lw.week_start_date,
    lw.created_at,
    vp.email,
    vp.first_name,
    vp.subscription_plan_id,
    sp.name as plan_name,
    sp.streaming_minutes_limit
FROM public.livestream_weekly_usage lw
LEFT JOIN public.verified_profiles vp ON lw.user_id = vp.id
LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
WHERE lw.created_at > NOW() - INTERVAL '30 minutes'
ORDER BY lw.created_at DESC;

-- 4. Check if there are any users with NULL subscription_plan_id
SELECT 
    'Users Without Subscription Plan' as check_type,
    COUNT(*) as count,
    array_agg(id) as user_ids
FROM public.verified_profiles
WHERE subscription_plan_id IS NULL;

-- 5. Check if there are orphaned subscription_plan_ids
SELECT 
    'Orphaned Subscription Plan IDs' as check_type,
    vp.id as user_id,
    vp.email,
    vp.subscription_plan_id,
    sp.id as plan_exists
FROM public.verified_profiles vp
LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
WHERE vp.subscription_plan_id IS NOT NULL 
AND sp.id IS NULL;

-- 6. Test the exact query the trigger uses for a specific user
DO $$
DECLARE
    test_user_id UUID;
    user_profile RECORD;
    user_limit INTEGER;
    current_usage INTEGER;
    usage_percentage NUMERIC;
BEGIN
    -- Get the most recent user from usage data
    SELECT user_id INTO test_user_id
    FROM public.livestream_weekly_usage 
    WHERE created_at > NOW() - INTERVAL '30 minutes'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No recent usage data found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with user ID: %', test_user_id;
    
    -- Try the exact query from the trigger
    SELECT 
        sp.streaming_minutes_limit,
        vp.email,
        vp.first_name
    INTO user_profile
    FROM public.verified_profiles vp
    JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE vp.id = test_user_id;
    
    IF user_profile IS NULL THEN
        RAISE NOTICE 'TRIGGER QUERY FAILED - User profile not found';
        
        -- Let's see what we can find about this user
        SELECT email, first_name, subscription_plan_id
        INTO user_profile
        FROM public.verified_profiles
        WHERE id = test_user_id;
        
        IF user_profile IS NULL THEN
            RAISE NOTICE 'User % not found in verified_profiles table at all', test_user_id;
        ELSE
            RAISE NOTICE 'User found in verified_profiles: email=%, subscription_plan_id=%', 
                user_profile.email, user_profile.subscription_plan_id;
                
            -- Check if the subscription plan exists
            IF user_profile.subscription_plan_id IS NULL THEN
                RAISE NOTICE 'User has NULL subscription_plan_id';
            ELSE
                IF EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = user_profile.subscription_plan_id) THEN
                    RAISE NOTICE 'Subscription plan exists in subscription_plans table';
                ELSE
                    RAISE NOTICE 'Subscription plan % does not exist in subscription_plans table', user_profile.subscription_plan_id;
                END IF;
            END IF;
        END IF;
    ELSE
        RAISE NOTICE 'TRIGGER QUERY SUCCESS - Found user profile';
        RAISE NOTICE 'Email: %, Name: %, Limit: % minutes', 
            user_profile.email, user_profile.first_name, user_profile.streaming_minutes_limit;
            
        -- Get current usage
        SELECT COALESCE(SUM(streamed_minutes), 0) INTO current_usage
        FROM public.livestream_weekly_usage
        WHERE user_id = test_user_id
        AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;
        
        -- Calculate percentage
        user_limit := user_profile.streaming_minutes_limit;
        IF user_limit > 0 THEN
            usage_percentage := (current_usage::NUMERIC / user_limit::NUMERIC) * 100;
        ELSE
            usage_percentage := 0;
        END IF;
        
        RAISE NOTICE 'Usage: %/% minutes (% percent)', current_usage, user_limit, ROUND(usage_percentage, 1);
        
        IF usage_percentage >= 75 THEN
            RAISE NOTICE 'Should create notification (usage >= 75 percent)';
        ELSE
            RAISE NOTICE 'Should NOT create notification (usage < 75 percent)';
        END IF;
    END IF;
END $$;
