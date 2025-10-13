-- Test the complete flow: Create notification -> Process -> Send email

-- Step 1: Create a test notification manually
INSERT INTO studio_notifications (user_id, type, title, body, message, metadata)
VALUES (
    '29a4414e-d60f-42c1-bbfd-9166f17211a0',
    'streaming_limit_reached',
    'Weekly Streaming Limit Reached',
    'You have reached your weekly streaming limit of 60 minutes. Your limit will reset on Monday.',
    'You have reached your weekly streaming limit',
    jsonb_build_object(
        'current_usage', 60,
        'limit', 60,
        'week_start', date_trunc('week', CURRENT_DATE)::date,
        'reset_date', (date_trunc('week', CURRENT_DATE) + INTERVAL '7 days')::date
    )
);

-- Step 2: Check the notification was created
SELECT 'Notification created:' as test_name;
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
