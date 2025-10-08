-- Test if the trigger is actually firing

-- 1. Clear any existing notifications for clean test
DELETE FROM public.studio_notifications 
WHERE type IN ('streaming_limit_warning', 'streaming_limit_reached');

-- 2. Insert test data that should trigger notification (75% usage)
DO $$
DECLARE
    test_user_id UUID := '29a4414e-d60f-42c1-bbfd-9166f17211a0'; -- Replace with actual user ID
    current_week_start DATE;
BEGIN
    current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    RAISE NOTICE 'Starting trigger test for user: %', test_user_id;
    
    -- Clear existing usage for this user
    DELETE FROM public.livestream_weekly_usage
    WHERE user_id = test_user_id
    AND week_start_date = current_week_start;
    
    RAISE NOTICE 'Cleared existing usage data';
    
    -- Insert 75% usage (900 minutes) - this should trigger the notification
    INSERT INTO public.livestream_weekly_usage (
        user_id,
        week_start_date,
        streamed_minutes,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        current_week_start,
        900, -- 75% of 1200 minutes
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Inserted 900 minutes - trigger should have fired';
    
    -- Wait a moment for trigger to complete
    PERFORM pg_sleep(1);
    
END $$;

-- 3. Check if notifications were created
SELECT 
    'Notifications After Insert' as check_type,
    COUNT(*) as notification_count,
    array_agg(type) as notification_types,
    array_agg(metadata->>'usage_percentage') as usage_percentages
FROM public.studio_notifications 
WHERE created_at > NOW() - INTERVAL '1 minute';

-- 4. Show notification details if any were created
SELECT 
    'Notification Details' as check_type,
    id,
    user_id,
    type,
    title,
    created_at,
    metadata->>'usage_percentage' as usage_pct,
    metadata->>'current_minutes' as current_mins,
    metadata->>'limit_minutes' as limit_mins
FROM public.studio_notifications 
WHERE created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC;

-- 5. Test trigger with UPDATE as well
DO $$
DECLARE
    test_user_id UUID := '29a4414e-d60f-42c1-bbfd-9166f17211a0';
    current_week_start DATE;
BEGIN
    current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    RAISE NOTICE 'Testing trigger with UPDATE (100%% usage)';
    
    -- Update to 100% usage (1200 minutes) - should trigger limit reached
    UPDATE public.livestream_weekly_usage 
    SET streamed_minutes = 1200,
        updated_at = NOW()
    WHERE user_id = test_user_id
    AND week_start_date = current_week_start;
    
    RAISE NOTICE 'Updated to 1200 minutes - trigger should have fired again';
    
    -- Wait a moment for trigger to complete
    PERFORM pg_sleep(1);
    
END $$;

-- 6. Check final notification count
SELECT 
    'Final Notification Count' as check_type,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN type = 'streaming_limit_warning' THEN 1 END) as warning_count,
    COUNT(CASE WHEN type = 'streaming_limit_reached' THEN 1 END) as reached_count
FROM public.studio_notifications 
WHERE created_at > NOW() - INTERVAL '2 minutes';

-- 7. Show all notifications created in this test
SELECT 
    'All Test Notifications' as check_type,
    id,
    type,
    title,
    created_at,
    metadata->>'usage_percentage' as usage_pct,
    metadata->>'notification_type' as notif_type
FROM public.studio_notifications 
WHERE created_at > NOW() - INTERVAL '2 minutes'
ORDER BY created_at ASC;
