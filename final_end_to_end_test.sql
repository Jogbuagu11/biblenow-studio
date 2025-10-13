-- Final end-to-end test: Simulate a user reaching their streaming limit
-- This should trigger the notification, which should be processed by the service, which should send an email

-- Step 1: Reset the user's weekly usage to 0
DELETE FROM livestream_weekly_usage 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid;

-- Step 2: Add streaming minutes to reach the limit (60 minutes)
SELECT 'Adding 60 minutes to reach streaming limit:' as test_name;
SELECT streaming_add_minutes('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid, 60);

-- Step 3: Check if notification was created
SELECT 'Checking for notification:' as test_name;
SELECT 
    id,
    user_id,
    type,
    title,
    body,
    processed_at,
    created_at
FROM studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid
AND type = 'streaming_limit_reached'
ORDER BY created_at DESC
LIMIT 1;

-- Step 4: Check the weekly usage
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
LIMIT 1;
