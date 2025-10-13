-- Test the functions after cleanup to ensure they work correctly
-- Replace '29a4414e-d60f-42c1-bbfd-9166f17211a0' with the actual user ID you want to test

-- Test 1: Get user streaming limit
SELECT 'Testing get_user_streaming_limit:' as test_name;
SELECT get_user_streaming_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as streaming_limit;

-- Test 2: Get current weekly usage
SELECT 'Testing get_weekly_streaming_usage:' as test_name;
SELECT get_weekly_streaming_usage('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as current_usage;

-- Test 3: Add streaming minutes (this should trigger the notification if limit is reached)
SELECT 'Testing add_streaming_minutes:' as test_name;
SELECT add_streaming_minutes('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid, 50);

-- Test 4: Check if notification was created
SELECT 'Checking for notifications:' as test_name;
SELECT 
    id,
    user_id,
    type,
    message,
    created_at
FROM studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid
AND type = 'streaming_limit_reached'
ORDER BY created_at DESC
LIMIT 5;

-- Test 5: Check weekly usage table
SELECT 'Checking weekly usage table:' as test_name;
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
