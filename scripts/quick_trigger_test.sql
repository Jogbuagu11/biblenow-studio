-- Quick trigger test and fix without database reset

-- 1. Check current trigger status
SELECT 
    'CURRENT TRIGGERS' as status,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'livestream_weekly_usage'
AND trigger_schema = 'public';

-- 2. Check if function exists
SELECT 
    'FUNCTION EXISTS' as status,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'notify_streaming_limit_status'
AND routine_schema = 'public';

-- 3. Drop and recreate trigger (simple version)
DROP TRIGGER IF EXISTS notify_streaming_limit_status_trigger ON public.livestream_weekly_usage;
DROP TRIGGER IF EXISTS streaming_limit_notification_trigger ON public.livestream_weekly_usage;

-- 4. Create simple trigger function
CREATE OR REPLACE FUNCTION notify_streaming_limit_status()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE '🔥 TRIGGER FIRED! User: %, Minutes: %', NEW.user_id, NEW.streamed_minutes;
    
    -- Just create a simple notification for testing
    INSERT INTO public.studio_notifications (
        user_id,
        type,
        title,
        body,
        metadata,
        is_read,
        created_at
    ) VALUES (
        NEW.user_id,
        'streaming_limit_warning',
        'Test Trigger Notification',
        'This notification was created by the database trigger.',
        jsonb_build_object(
            'notification_type', 'test',
            'trigger_test', true,
            'streamed_minutes', NEW.streamed_minutes
        ),
        false,
        NOW()
    );
    
    RAISE NOTICE '✅ Test notification created';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create the trigger
CREATE TRIGGER notify_streaming_limit_status_trigger
    AFTER INSERT OR UPDATE OF streamed_minutes
    ON public.livestream_weekly_usage
    FOR EACH ROW
    EXECUTE FUNCTION notify_streaming_limit_status();

-- 6. Test immediately
DO $$
DECLARE
    test_user_id UUID := '29a4414e-d60f-42c1-bbfd-9166f17211a0';
BEGIN
    RAISE NOTICE '🧪 Testing trigger now...';
    
    -- Clear old notifications
    DELETE FROM public.studio_notifications 
    WHERE user_id = test_user_id 
    AND metadata->>'trigger_test' = 'true';
    
    -- Insert test data to fire trigger
    INSERT INTO public.livestream_weekly_usage (
        user_id,
        week_start_date,
        streamed_minutes,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        DATE_TRUNC('week', CURRENT_DATE)::DATE,
        123, -- Random number to test
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Test insert completed';
END $$;

-- 7. Check if notification was created
SELECT 
    'TRIGGER TEST RESULT' as status,
    COUNT(*) as notifications_created,
    MAX(created_at) as latest_notification
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND metadata->>'trigger_test' = 'true'
AND created_at > NOW() - INTERVAL '1 minute';
