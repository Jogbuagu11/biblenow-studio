-- Debug trigger status and test trigger firing

-- 1. Check if trigger exists
SELECT 
    'TRIGGER STATUS' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    action_condition
FROM information_schema.triggers 
WHERE event_object_table = 'livestream_weekly_usage'
AND trigger_schema = 'public';

-- 2. Check if function exists
SELECT 
    'FUNCTION STATUS' as check_type,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'notify_streaming_limit_status'
AND routine_schema = 'public';

-- 3. Test the trigger by inserting test data
DO $$
DECLARE
    test_user_id UUID := '29a4414e-d60f-42c1-bbfd-9166f17211a0';
    current_week_start DATE;
BEGIN
    -- Calculate current week start (Monday)
    current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    RAISE NOTICE '🧪 Testing trigger with user: %', test_user_id;
    RAISE NOTICE '🧪 Current week start: %', current_week_start;
    
    -- Clear existing data for this user and week
    DELETE FROM public.livestream_weekly_usage
    WHERE user_id = test_user_id
    AND week_start_date = current_week_start;
    
    RAISE NOTICE '🧹 Cleared existing usage data';
    
    -- Insert test data that should trigger the function
    INSERT INTO public.livestream_weekly_usage (
        user_id,
        week_start_date,
        streamed_minutes,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        current_week_start,
        900, -- 75% of 1200 minutes
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Inserted test usage data (900 minutes)';
    RAISE NOTICE '📋 If trigger is working, you should see "TRIGGER FIRED" messages above';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error during trigger test: %', SQLERRM;
END $$;

-- 4. Check if notifications were created
SELECT 
    'NOTIFICATIONS CREATED' as check_type,
    id,
    type,
    title,
    created_at,
    processed_at,
    metadata->>'usage_percentage' as usage_pct
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- 5. Check current usage data
SELECT 
    'CURRENT USAGE' as check_type,
    user_id,
    week_start_date,
    streamed_minutes,
    created_at
FROM public.livestream_weekly_usage 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
ORDER BY created_at DESC
LIMIT 3;
