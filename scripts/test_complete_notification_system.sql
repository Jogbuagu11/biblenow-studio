-- Complete test of the notification system
-- This will test: Database trigger → Notification creation → Frontend processing → Email sending

DO $$
DECLARE
    streamer_id UUID := '29a4414e-d60f-42c1-bbfd-9166f17211a0';
    current_week_start DATE;
BEGIN
    current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    RAISE NOTICE '🧪 TESTING COMPLETE NOTIFICATION SYSTEM';
    RAISE NOTICE '==========================================';
    
    -- Step 1: Clean slate
    RAISE NOTICE '1. Cleaning existing data...';
    DELETE FROM public.livestream_weekly_usage WHERE user_id = streamer_id AND week_start_date = current_week_start;
    DELETE FROM public.studio_notifications WHERE user_id = streamer_id;
    
    -- Step 2: Test 75% usage (warning)
    RAISE NOTICE '2. Testing 75%% warning notification...';
    INSERT INTO public.livestream_weekly_usage (user_id, week_start_date, streamed_minutes, created_at, updated_at)
    VALUES (streamer_id, current_week_start, 900, NOW(), NOW());
    
    -- Wait a moment for trigger
    PERFORM pg_sleep(1);
    
    -- Step 3: Test 100% usage (limit reached)
    RAISE NOTICE '3. Testing 100%% limit reached notification...';
    UPDATE public.livestream_weekly_usage 
    SET streamed_minutes = 1200, updated_at = NOW()
    WHERE user_id = streamer_id AND week_start_date = current_week_start;
    
    RAISE NOTICE '✅ Test data inserted successfully';
    
END $$;

-- Verify results
SELECT '📊 RESULTS SUMMARY' as section, '==================' as divider;

-- Check notifications created
SELECT 
    '🔔 Notifications Created' as check_type,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN type = 'streaming_limit_warning' THEN 1 END) as warning_count,
    COUNT(CASE WHEN type = 'streaming_limit_reached' THEN 1 END) as reached_count,
    COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as processed_count,
    COUNT(CASE WHEN processed_at IS NULL THEN 1 END) as pending_count
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND created_at > NOW() - INTERVAL '5 minutes';

-- Show notification details
SELECT 
    '📋 Notification Details' as check_type,
    id,
    type,
    title,
    created_at,
    processed_at,
    CASE 
        WHEN processed_at IS NOT NULL THEN '✅ Processed'
        ELSE '⏳ Pending'
    END as status,
    metadata->>'usage_percentage' as usage_pct,
    metadata->>'email' as email_address
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- Check current usage
SELECT 
    '📈 Current Usage' as check_type,
    has_reached_limit,
    current_minutes,
    limit_minutes,
    usage_percentage,
    remaining_minutes
FROM check_weekly_streaming_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0');

-- Instructions
SELECT '📝 NEXT STEPS' as section, '============' as divider;

SELECT 
    '1️⃣ Frontend Test' as step,
    'Open your React app and check the dashboard for the StreamingLimitBanner' as instruction
UNION ALL
SELECT 
    '2️⃣ Toast Test' as step,
    'You should see toast notifications for 75% and 100% usage' as instruction
UNION ALL
SELECT 
    '3️⃣ Bell Test' as step,
    'Check the notification bell for streaming limit notifications' as instruction
UNION ALL
SELECT 
    '4️⃣ Email Test' as step,
    'Wait 30 seconds, then run the JavaScript test in browser console to process emails' as instruction
UNION ALL
SELECT 
    '5️⃣ Verification' as step,
    'Run: SELECT * FROM studio_notifications WHERE processed_at IS NOT NULL' as instruction;
