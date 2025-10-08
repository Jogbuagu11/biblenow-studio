-- Create test notifications for the authenticated user
-- User ID: 29a4414e-d60f-42c1-bbfd-9166f17211a0

DO $$
DECLARE
    test_user_id UUID := '29a4414e-d60f-42c1-bbfd-9166f17211a0';
    user_profile RECORD;
    notification_id_1 UUID;
    notification_id_2 UUID;
BEGIN
    -- Check if user exists in verified_profiles
    SELECT email, first_name 
    INTO user_profile
    FROM public.verified_profiles 
    WHERE id = test_user_id;

    IF user_profile IS NULL THEN
        RAISE NOTICE '❌ User % not found in verified_profiles table', test_user_id;
        RETURN;
    END IF;

    RAISE NOTICE '✅ Found user: % (%)', user_profile.first_name, user_profile.email;

    -- Clear existing notifications for this user
    DELETE FROM public.studio_notifications 
    WHERE user_id = test_user_id;
    
    RAISE NOTICE '🧹 Cleared existing notifications for user';

    -- Insert test warning notification (75% usage)
    INSERT INTO public.studio_notifications (
        user_id,
        type,
        title,
        body,
        metadata,
        is_read,
        created_at
    ) VALUES (
        test_user_id,
        'streaming_limit_warning',
        'Approaching Weekly Streaming Limit',
        'You have used 75.0% of your weekly streaming limit (900 of 1200 minutes). Your limit will reset on 2025-10-15.',
        jsonb_build_object(
            'notification_type', 'warning',
            'usage_percentage', 75.0,
            'current_minutes', 900,
            'limit_minutes', 1200,
            'remaining_minutes', 300,
            'reset_date', '2025-10-15',
            'email', user_profile.email,
            'first_name', user_profile.first_name
        ),
        false,
        NOW() - INTERVAL '2 minutes'
    ) RETURNING id INTO notification_id_1;

    RAISE NOTICE '📧 Created warning notification: %', notification_id_1;

    -- Insert test limit reached notification (100% usage)
    INSERT INTO public.studio_notifications (
        user_id,
        type,
        title,
        body,
        metadata,
        is_read,
        created_at
    ) VALUES (
        test_user_id,
        'streaming_limit_reached',
        'Weekly Streaming Limit Reached',
        'You have reached your weekly streaming limit (1200 of 1200 minutes). Your limit will reset on 2025-10-15. Upgrade your plan to continue streaming.',
        jsonb_build_object(
            'notification_type', 'reached',
            'usage_percentage', 100.0,
            'current_minutes', 1200,
            'limit_minutes', 1200,
            'remaining_minutes', 0,
            'reset_date', '2025-10-15',
            'email', user_profile.email,
            'first_name', user_profile.first_name
        ),
        false,
        NOW() - INTERVAL '1 minute'
    ) RETURNING id INTO notification_id_2;

    RAISE NOTICE '🚫 Created limit reached notification: %', notification_id_2;

    -- Verify the notifications were created
    RAISE NOTICE '🔍 Verification - checking created notifications...';
    
    PERFORM 1 FROM public.studio_notifications 
    WHERE user_id = test_user_id 
    AND processed_at IS NULL;
    
    IF FOUND THEN
        RAISE NOTICE '✅ Test notifications created successfully!';
        RAISE NOTICE '📋 Next steps:';
        RAISE NOTICE '   1. Click the "📧 Test Email Function" button again';
        RAISE NOTICE '   2. Watch the console for processing logs';
        RAISE NOTICE '   3. Check your email for the test messages';
    ELSE
        RAISE NOTICE '❌ No unprocessed notifications found after creation';
    END IF;

END $$;

-- Show the created notifications
SELECT 
    id,
    type,
    title,
    created_at,
    processed_at,
    metadata->>'email' as email,
    metadata->>'notification_type' as notif_type,
    metadata->>'usage_percentage' as usage_pct
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
ORDER BY created_at DESC;
