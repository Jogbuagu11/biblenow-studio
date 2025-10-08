-- Check current notification status
SELECT 
    'Notification Status' as check_type,
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
    metadata->>'email' as email_address,
    metadata->>'notification_type' as notif_type
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
