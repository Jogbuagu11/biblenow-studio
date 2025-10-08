-- Complete test script for email notifications system
-- This will test the entire flow: trigger -> notification -> email

DO $$
DECLARE
    streamer_id UUID := '29a4414e-d60f-42c1-bbfd-9166f17211a0';
    current_week_start DATE;
BEGIN
    -- Calculate current week start (Monday)
    current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    RAISE NOTICE '=== TESTING EMAIL NOTIFICATION SYSTEM ===';
    RAISE NOTICE 'User ID: %', streamer_id;
    RAISE NOTICE 'Week starting: %', current_week_start;
    
    -- Step 1: Clear existing data for clean test
    RAISE NOTICE '1. Clearing existing data...';
    
    DELETE FROM public.livestream_weekly_usage
    WHERE user_id = streamer_id
    AND week_start_date = current_week_start;
    
    DELETE FROM public.studio_notifications
    WHERE user_id = streamer_id;
    
    RAISE NOTICE '   ✓ Cleared existing usage and notifications';
    
    -- Step 2: Insert 75% usage to trigger warning
    RAISE NOTICE '2. Inserting 75%% usage (900 minutes)...';
    
    INSERT INTO public.livestream_weekly_usage (
        user_id,
        week_start_date,
        streamed_minutes,
        created_at,
        updated_at
    ) VALUES (
        streamer_id,
        current_week_start,
        900, -- 75% of 1200 minutes (Cedar plan)
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '   ✓ Inserted 900 minutes of usage';
    
END $$;

-- Step 3: Verify the results
SELECT '3. Checking results...' as status;

-- Check usage was inserted
SELECT 
    '✓ Usage Record' as check_type,
    user_id,
    week_start_date,
    streamed_minutes,
    created_at
FROM public.livestream_weekly_usage 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;

-- Check streaming limit calculation
SELECT 
    '✓ Limit Calculation' as check_type,
    has_reached_limit,
    current_minutes,
    limit_minutes,
    remaining_minutes,
    usage_percentage
FROM check_weekly_streaming_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0');

-- Check notifications were created
SELECT 
    '✓ Notifications Created' as check_type,
    id,
    type,
    title,
    is_read,
    processed_at,
    created_at,
    metadata->>'usage_percentage' as usage_pct,
    metadata->>'email' as email_address,
    metadata->>'notification_type' as notif_type
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
ORDER BY created_at DESC;

-- Check user profile exists
SELECT 
    '✓ User Profile' as check_type,
    vp.id,
    vp.email,
    vp.first_name,
    sp.name as plan_name,
    sp.streaming_minutes_limit
FROM public.verified_profiles vp
LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
WHERE vp.id = '29a4414e-d60f-42c1-bbfd-9166f17211a0';

-- Instructions for next steps
SELECT 
    '📋 Next Steps' as instruction_type,
    'Check your frontend app - NotificationService should pick up the notification and send email within 30 seconds' as message
UNION ALL
SELECT 
    '📋 Frontend Check' as instruction_type,
    'Open browser console and look for "Processing X streaming limit notifications" messages' as message
UNION ALL
SELECT 
    '📋 Email Check' as instruction_type,
    'After 30 seconds, run: SELECT * FROM studio_notifications WHERE processed_at IS NOT NULL' as message;
