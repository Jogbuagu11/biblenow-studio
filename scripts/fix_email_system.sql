-- Fix the email system by updating studio_settings and testing

-- Step 1: Update studio_settings with correct values
-- Replace 'YOUR_SERVICE_ROLE_KEY_HERE' with your actual service role key from Supabase dashboard

UPDATE public.studio_settings 
SET value = 'https://jhlawjmyorpmafokxtuh.supabase.co'
WHERE key = 'supabase_url';

-- You need to replace this with your actual service role key
-- Get it from: Supabase Dashboard > Settings > API > service_role key
UPDATE public.studio_settings 
SET value = 'YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE'
WHERE key = 'service_role_key';

-- Step 2: Check current settings
SELECT 
    'Settings Check' as status,
    key,
    CASE 
        WHEN key = 'service_role_key' THEN 
            CASE 
                WHEN LENGTH(value) > 100 THEN 'Valid key length'
                WHEN LENGTH(value) > 20 THEN 'Possibly valid key'
                ELSE 'Invalid - too short'
            END
        ELSE value 
    END as value_status
FROM public.studio_settings
ORDER BY key;

-- Step 3: Clear existing notifications to avoid duplicates
DELETE FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND type IN ('streaming_limit_warning', 'streaming_limit_reached');

-- Step 4: Test the system by inserting new usage
-- This should trigger the notification system
INSERT INTO public.livestream_weekly_usage (
    user_id,
    week_start_date,
    streamed_minutes,
    created_at,
    updated_at
) VALUES (
    '29a4414e-d60f-42c1-bbfd-9166f17211a0',
    DATE_TRUNC('week', CURRENT_DATE)::DATE,
    900, -- 75% of 1200 minutes
    NOW(),
    NOW()
)
ON CONFLICT (user_id, week_start_date) 
DO UPDATE SET 
    streamed_minutes = EXCLUDED.streamed_minutes,
    updated_at = NOW();

-- Step 5: Check if notification was created
SELECT 
    'New Notification' as status,
    id,
    type,
    title,
    created_at,
    metadata->>'usage_percentage' as usage_pct,
    metadata->>'email' as email_address
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC;
