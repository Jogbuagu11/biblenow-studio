-- Test Dashboard Weekly Usage for mrs.ogbuagu@gmail.com
-- Run this in your Supabase SQL Editor

-- 1. Get user profile with subscription plan details
SELECT 
    'User Profile' as test_step,
    vp.id,
    vp.email,
    vp.subscription_plan,
    vp.subscription_plan_id,
    sp.name as plan_name,
    sp.streaming_minutes_limit,
    sp.price_usd
FROM public.verified_profiles vp
LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
WHERE vp.email = 'mrs.ogbuagu@gmail.com';

-- 2. Calculate weekly usage (same logic as the frontend)
WITH weekly_usage_calc AS (
    SELECT 
        streamer_id,
        DATE_TRUNC('week', started_at)::DATE as week_start_date,
        SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60) as calculated_minutes
    FROM public.livestreams 
    WHERE streamer_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
    AND status = 'ended'
    AND started_at IS NOT NULL 
    AND ended_at IS NOT NULL
    AND started_at >= DATE_TRUNC('week', CURRENT_DATE)
    AND started_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
    GROUP BY streamer_id, DATE_TRUNC('week', started_at)::DATE
)
SELECT 
    'Weekly Usage Calculation' as test_step,
    wuc.calculated_minutes,
    wuc.calculated_minutes / 60.0 as calculated_hours,
    wu.streamed_minutes as stored_minutes,
    wu.streamed_minutes / 60.0 as stored_hours
FROM weekly_usage_calc wuc
LEFT JOIN public.livestream_weekly_usage wu ON wuc.streamer_id = wu.user_id AND wuc.week_start_date = wu.week_start_date;

-- 3. Get days remaining in week
SELECT 
    'Days Remaining' as test_step,
    EXTRACT(DOW FROM CURRENT_DATE) as day_of_week,
    CASE 
        WHEN EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN 0 
        ELSE 7 - EXTRACT(DOW FROM CURRENT_DATE) 
    END as days_remaining;

-- 4. Get weekly limit based on subscription plan
SELECT 
    'Weekly Limit' as test_step,
    vp.subscription_plan,
    sp.streaming_minutes_limit,
    sp.streaming_minutes_limit / 60.0 as streaming_hours_limit
FROM public.verified_profiles vp
LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
WHERE vp.email = 'mrs.ogbuagu@gmail.com';

-- 5. Simulate dashboard data (combining all the above)
WITH user_data AS (
    SELECT 
        vp.id,
        vp.email,
        vp.subscription_plan,
        sp.streaming_minutes_limit,
        sp.streaming_minutes_limit / 60.0 as streaming_hours_limit
    FROM public.verified_profiles vp
    LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE vp.email = 'mrs.ogbuagu@gmail.com'
),
usage_data AS (
    SELECT 
        streamer_id,
        SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60) as total_minutes
    FROM public.livestreams 
    WHERE streamer_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
    AND status = 'ended'
    AND started_at IS NOT NULL 
    AND ended_at IS NOT NULL
    AND started_at >= DATE_TRUNC('week', CURRENT_DATE)
    AND started_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
    GROUP BY streamer_id
),
days_remaining AS (
    SELECT 
        CASE 
            WHEN EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN 0 
            ELSE 7 - EXTRACT(DOW FROM CURRENT_DATE) 
        END as days_remaining
)
SELECT 
    'Dashboard Simulation' as test_step,
    ud.email,
    ud.subscription_plan,
    ud.streaming_minutes_limit,
    ud.streaming_hours_limit,
    COALESCE(u.total_minutes, 0) as current_minutes,
    COALESCE(u.total_minutes / 60.0, 0) as current_hours,
    dr.days_remaining,
    CASE 
        WHEN ud.streaming_minutes_limit > 0 THEN 
            (COALESCE(u.total_minutes, 0) / ud.streaming_minutes_limit) * 100
        ELSE 0 
    END as usage_percentage,
    CASE 
        WHEN ud.streaming_minutes_limit > 0 THEN 
            ud.streaming_minutes_limit - COALESCE(u.total_minutes, 0)
        ELSE 0 
    END as remaining_minutes,
    CASE 
        WHEN ud.streaming_minutes_limit > 0 THEN 
            (ud.streaming_minutes_limit - COALESCE(u.total_minutes, 0)) / 60.0
        ELSE 0 
    END as remaining_hours
FROM user_data ud
LEFT JOIN usage_data u ON ud.id = u.streamer_id
CROSS JOIN days_remaining dr; 