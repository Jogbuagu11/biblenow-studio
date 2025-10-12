-- Test the streaming limit trigger system
-- This will create a record for the user and trigger the email notification

-- 1. First, run the create_weekly_usage_table.sql script above

-- 2. Add streaming minutes for the user to trigger the notification
-- Based on the dashboard, the user has used 20h 8m (1208 minutes) of 20h 0m (1200 minutes) limit
SELECT add_streaming_minutes(
    '29a4414e-d60f-42c1-bbfd-9166f17211a0'::UUID,  -- User ID
    1208,  -- 20h 8m in minutes (100.7% of 1200 minute limit)
    DATE_TRUNC('week', CURRENT_DATE)::DATE  -- Current week
);

-- 3. Check if the notification was created
SELECT 
    id,
    type,
    title,
    body,
    created_at,
    processed_at,
    metadata
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND type IN ('streaming_limit_warning', 'streaming_limit_reached')
ORDER BY created_at DESC;

-- 4. Check the weekly usage record
SELECT 
    user_id,
    week_start_date,
    streamed_minutes,
    created_at,
    updated_at
FROM public.livestream_weekly_usage 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
ORDER BY week_start_date DESC;
