-- Test that notifications are being created when streaming limit is reached

-- Test 1: Add streaming minutes to trigger a notification
SELECT 'Testing notification creation:' as test_name;
SELECT streaming_add_minutes('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid, 50);

-- Test 2: Check if notification was created
SELECT 'Checking for notifications:' as test_name;
SELECT 
    id,
    user_id,
    type,
    message,
    metadata,
    created_at
FROM studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid
AND type = 'streaming_limit_reached'
ORDER BY created_at DESC
LIMIT 5;

-- Test 3: Check the weekly usage table
SELECT 'Checking weekly usage:' as test_name;
SELECT 
    user_id,
    week_start_date,
    minutes_streamed,
    created_at,
    updated_at
FROM livestream_weekly_usage 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid
ORDER BY week_start_date DESC
LIMIT 5;

-- Test 4: Check current usage and limit
SELECT 'Checking current usage and limit:' as test_name;
SELECT 
    streaming_get_user_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as user_limit,
    streaming_get_weekly_usage('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as current_usage;
