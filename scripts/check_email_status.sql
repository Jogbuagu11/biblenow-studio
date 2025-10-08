-- Check the current status of email notifications

-- 1. Check all notifications for the test user
SELECT 
    '📧 All Notifications' as status,
    id,
    type,
    title,
    is_read,
    processed_at,
    created_at,
    metadata->>'usage_percentage' as usage_pct,
    metadata->>'email' as email_address,
    metadata->>'notification_type' as notif_type,
    CASE 
        WHEN processed_at IS NOT NULL THEN '✅ Processed'
        ELSE '⏳ Pending'
    END as email_status
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
ORDER BY created_at DESC;

-- 2. Check unprocessed notifications (what the frontend should pick up)
SELECT 
    '⏳ Unprocessed Notifications' as status,
    COUNT(*) as count,
    MIN(created_at) as oldest_unprocessed,
    MAX(created_at) as newest_unprocessed
FROM public.studio_notifications 
WHERE processed_at IS NULL
AND type IN ('streaming_limit_warning', 'streaming_limit_reached');

-- 3. Check processed notifications (emails that were sent)
SELECT 
    '✅ Processed Notifications' as status,
    COUNT(*) as count,
    MIN(processed_at) as first_processed,
    MAX(processed_at) as last_processed
FROM public.studio_notifications 
WHERE processed_at IS NOT NULL
AND type IN ('streaming_limit_warning', 'streaming_limit_reached');

-- 4. Show recent notification details
SELECT 
    '🔍 Recent Notification Details' as status,
    id,
    type,
    created_at,
    processed_at,
    metadata->>'email_status' as email_result,
    metadata->>'email_error' as email_error,
    EXTRACT(EPOCH FROM (NOW() - created_at)) as seconds_since_created
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND type IN ('streaming_limit_warning', 'streaming_limit_reached')
ORDER BY created_at DESC
LIMIT 3;
