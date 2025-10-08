-- Debug why email function wasn't triggered

-- 1. Check if notifications were created
SELECT 
    'Studio Notifications' as table_name,
    id,
    user_id,
    type,
    title,
    is_read,
    processed_at,
    created_at,
    metadata->>'usage_percentage' as usage_percentage,
    metadata->>'notification_type' as notification_type,
    metadata->>'email' as email,
    metadata->>'first_name' as first_name
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check current usage and limit calculation
SELECT 
    'Usage Check' as check_type,
    *
FROM check_weekly_streaming_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0');

-- 3. Check if user profile exists and has correct plan
SELECT 
    'User Profile' as check_type,
    vp.id,
    vp.email,
    vp.first_name,
    vp.subscription_plan_id,
    sp.name as plan_name,
    sp.streaming_minutes_limit
FROM public.verified_profiles vp
LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
WHERE vp.id = '29a4414e-d60f-42c1-bbfd-9166f17211a0';

-- 4. Check current week's usage
SELECT 
    'Weekly Usage' as check_type,
    user_id,
    week_start_date,
    streamed_minutes,
    created_at
FROM public.livestream_weekly_usage 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;

-- 5. Check if trigger exists and is enabled
SELECT 
    'Trigger Status' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    action_condition
FROM information_schema.triggers 
WHERE trigger_name = 'notify_streaming_limit_status_trigger'
AND event_object_table = 'livestream_weekly_usage';

-- 6. Check if we can simulate the trigger by updating the record
SELECT 
    'Trigger Simulation' as check_type,
    'Updating usage record to trigger notification' as message;

-- Force trigger by updating the usage record (this should fire the trigger)
UPDATE public.livestream_weekly_usage 
SET updated_at = NOW()
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;

-- Check if any new notifications were created after the update
SELECT 
    'Post-Update Notifications' as check_type,
    COUNT(*) as notification_count,
    MAX(created_at) as latest_notification
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND created_at > NOW() - INTERVAL '1 minute';
