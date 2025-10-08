-- Troubleshooting script for subscription plans and weekly limits

-- 1. Check verified_profiles table for the user's subscription details
SELECT 
    id,
    email,
    subscription_plan,
    subscription_plan_id,
    created_at,
    updated_at
FROM public.verified_profiles
WHERE subscription_plan = 'Cedar'
OR subscription_plan_id IN (
    SELECT id FROM public.subscription_plans WHERE name = 'Cedar'
);

-- 2. Check subscription_plans table
SELECT *
FROM public.subscription_plans
WHERE name = 'Cedar'
OR id IN (
    SELECT subscription_plan_id 
    FROM public.verified_profiles 
    WHERE subscription_plan = 'Cedar'
);

-- 3. Check if there's a mismatch between subscription_plan and subscription_plan_id
SELECT 
    vp.id,
    vp.email,
    vp.subscription_plan,
    vp.subscription_plan_id,
    sp.name as plan_name,
    sp.streaming_minutes_limit
FROM public.verified_profiles vp
LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
WHERE vp.subscription_plan = 'Cedar'
OR sp.name = 'Cedar';

-- 4. Check weekly usage records for Cedar users
SELECT 
    lw.*,
    vp.email,
    vp.subscription_plan
FROM public.livestream_weekly_usage lw
JOIN public.verified_profiles vp ON lw.user_id = vp.id
WHERE vp.subscription_plan = 'Cedar'
AND lw.week_start_date >= CURRENT_DATE - INTERVAL '7 days';

-- 5. Check if the check_weekly_streaming_limit function is working
SELECT * FROM public.check_weekly_streaming_limit(
    (SELECT id FROM public.verified_profiles WHERE subscription_plan = 'Cedar' LIMIT 1)
);

-- 6. Check for any NULL or invalid values in critical fields
SELECT 
    id,
    email,
    subscription_plan,
    subscription_plan_id,
    CASE 
        WHEN subscription_plan IS NULL THEN 'NULL_PLAN'
        WHEN subscription_plan = '' THEN 'EMPTY_PLAN'
        WHEN subscription_plan_id IS NULL THEN 'NULL_PLAN_ID'
        ELSE 'OK'
    END as issue
FROM public.verified_profiles
WHERE subscription_plan = 'Cedar'
OR id IN (
    SELECT user_id 
    FROM public.livestream_weekly_usage 
    WHERE week_start_date >= CURRENT_DATE - INTERVAL '7 days'
);

-- 7. Check if RLS policies might be affecting access
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('subscription_plans', 'verified_profiles', 'livestream_weekly_usage');

-- 8. Check if the Cedar plan is properly configured with streaming limits
SELECT 
    sp.*,
    EXISTS (
        SELECT 1 
        FROM public.verified_profiles 
        WHERE subscription_plan_id = sp.id
    ) as has_users
FROM public.subscription_plans sp
WHERE name = 'Cedar';
