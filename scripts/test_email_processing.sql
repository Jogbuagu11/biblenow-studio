-- Test email processing for the notifications we just created

-- 1. Check current unprocessed notifications
SELECT 
    'Unprocessed Notifications' as status,
    id,
    user_id,
    type,
    title,
    created_at,
    processed_at,
    metadata->>'usage_percentage' as usage_pct,
    metadata->>'email' as email_address,
    metadata->>'first_name' as first_name,
    metadata->>'notification_type' as notif_type
FROM public.studio_notifications 
WHERE processed_at IS NULL
AND type IN ('streaming_limit_warning', 'streaming_limit_reached')
ORDER BY created_at DESC;

-- 2. Show instructions for next steps
SELECT 
    '📧 EMAIL TESTING INSTRUCTIONS' as instruction_type,
    'Now test the email processing using one of these methods:' as message
UNION ALL
SELECT 
    '1️⃣ Test Button' as instruction_type,
    'Go to your React app dashboard and click the "🧪 Run Test" button' as message
UNION ALL
SELECT 
    '2️⃣ Browser Console' as instruction_type,
    'Copy the JavaScript from scripts/manual_edge_function_test.js into browser console' as message
UNION ALL
SELECT 
    '3️⃣ Wait for Auto-Processing' as instruction_type,
    'The NotificationService should automatically process these within 30 seconds' as message
UNION ALL
SELECT 
    '4️⃣ Check Results' as instruction_type,
    'After processing, run: SELECT * FROM studio_notifications WHERE processed_at IS NOT NULL' as message;
