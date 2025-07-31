-- Test and Fix Weekly Usage Recording
-- This script will diagnose and fix issues with weekly usage not being recorded

-- 1. First, let's check if the trigger exists and is working
SELECT 
    'Trigger Status' as check_type,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'livestreams'
AND trigger_name = 'trigger_update_weekly_usage_on_stream_end';

-- 2. Check if the function exists
SELECT 
    'Function Status' as check_type,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'update_weekly_usage_on_stream_end';

-- 3. Check current weekly usage data
SELECT 
    'Current Weekly Usage' as check_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users
FROM public.weekly_usage;

-- 4. Check recent streams that should have updated weekly usage
SELECT 
    'Recent Streams' as check_type,
    id,
    streamer_id,
    title,
    started_at,
    ended_at,
    status,
    is_live,
    EXTRACT(EPOCH FROM (ended_at - started_at)) / 60 as duration_minutes
FROM public.livestreams
WHERE ended_at IS NOT NULL
AND started_at IS NOT NULL
AND status = 'ended'
ORDER BY ended_at DESC
LIMIT 10;

-- 5. Test the weekly usage function manually
DO $$
DECLARE
    test_user_id UUID;
    test_stream_id UUID;
    test_duration INTEGER;
BEGIN
    -- Get a test user and stream
    SELECT streamer_id, id, EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
    INTO test_user_id, test_stream_id, test_duration
    FROM public.livestreams
    WHERE ended_at IS NOT NULL
    AND started_at IS NOT NULL
    AND status = 'ended'
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing weekly usage for user: %, stream: %, duration: % minutes', 
            test_user_id, test_stream_id, test_duration;
            
        -- Manually call the weekly usage function
        PERFORM public.update_weekly_usage_on_stream_end();
        
        RAISE NOTICE 'Weekly usage function executed successfully';
    ELSE
        RAISE NOTICE 'No test data found';
    END IF;
END $$;

-- 6. Check if weekly usage was updated
SELECT 
    'Weekly Usage After Test' as check_type,
    user_id,
    week_start_date,
    streamed_minutes,
    updated_at
FROM public.weekly_usage
ORDER BY updated_at DESC
LIMIT 5;

-- 7. If the trigger is not working, let's recreate it
DO $$
BEGIN
    -- Drop and recreate the trigger
    DROP TRIGGER IF EXISTS trigger_update_weekly_usage_on_stream_end ON public.livestreams;
    DROP FUNCTION IF EXISTS public.update_weekly_usage_on_stream_end();
    
    -- Create the improved function
    CREATE OR REPLACE FUNCTION public.update_weekly_usage_on_stream_end()
    RETURNS TRIGGER AS $$
    DECLARE
        stream_duration_minutes INTEGER;
        stream_week_start_date DATE;
        current_week_start_date DATE;
    BEGIN
        -- Only process when a stream is marked as ended
        IF NEW.status = 'ended' AND (OLD.status != 'ended' OR OLD.status IS NULL) THEN
            RAISE NOTICE 'Processing stream end for streamer: %, status: %', NEW.streamer_id, NEW.status;
            
            -- Calculate stream duration in minutes
            IF NEW.started_at IS NOT NULL AND NEW.ended_at IS NOT NULL THEN
                stream_duration_minutes := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
                RAISE NOTICE 'Stream duration: % minutes', stream_duration_minutes;
            ELSE
                stream_duration_minutes := 0;
                RAISE NOTICE 'No start/end time, duration: 0';
            END IF;
            
            -- Get the start of the week for the stream start date
            stream_week_start_date := DATE_TRUNC('week', NEW.started_at)::DATE;
            current_week_start_date := DATE_TRUNC('week', CURRENT_DATE)::DATE;
            
            RAISE NOTICE 'Stream week: %, Current week: %', stream_week_start_date, current_week_start_date;
            
            -- Record for the stream's week (not just current week)
            IF stream_duration_minutes > 0 THEN
                -- Insert or update weekly usage record
                INSERT INTO public.weekly_usage (user_id, week_start_date, streamed_minutes, updated_at)
                VALUES (NEW.streamer_id, stream_week_start_date, stream_duration_minutes, NOW())
                ON CONFLICT (user_id, week_start_date)
                DO UPDATE SET 
                    streamed_minutes = weekly_usage.streamed_minutes + EXCLUDED.streamed_minutes,
                    updated_at = NOW();
                    
                RAISE NOTICE 'Updated weekly usage for user %: added % minutes to week %', 
                    NEW.streamer_id, stream_duration_minutes, stream_week_start_date;
            END IF;
        END IF;
        
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Create the trigger
    CREATE TRIGGER trigger_update_weekly_usage_on_stream_end
        AFTER UPDATE ON public.livestreams
        FOR EACH ROW
        EXECUTE FUNCTION public.update_weekly_usage_on_stream_end();
        
    RAISE NOTICE 'Trigger and function recreated successfully';
END $$;

-- 8. Test with a manual stream end
DO $$
DECLARE
    test_stream_id UUID;
BEGIN
    -- Get a stream that hasn't been ended yet
    SELECT id INTO test_stream_id
    FROM public.livestreams
    WHERE status != 'ended'
    AND started_at IS NOT NULL
    LIMIT 1;
    
    IF test_stream_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with stream: %', test_stream_id;
        
        -- Manually end the stream to test the trigger
        UPDATE public.livestreams
        SET 
            status = 'ended',
            ended_at = NOW(),
            updated_at = NOW()
        WHERE id = test_stream_id;
        
        RAISE NOTICE 'Stream ended, trigger should have fired';
    ELSE
        RAISE NOTICE 'No test stream found';
    END IF;
END $$;

-- 9. Final check of weekly usage
SELECT 
    'Final Weekly Usage Check' as check_type,
    user_id,
    week_start_date,
    streamed_minutes,
    updated_at
FROM public.weekly_usage
ORDER BY updated_at DESC
LIMIT 10; 