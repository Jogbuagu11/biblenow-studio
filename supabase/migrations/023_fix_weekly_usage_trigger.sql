-- Fix the weekly usage trigger function to resolve ambiguous column reference
-- Run this in your Supabase SQL Editor

-- 1. Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_weekly_usage_on_stream_end ON public.livestreams;
DROP FUNCTION IF EXISTS public.update_weekly_usage_on_stream_end();

-- 2. Create the fixed function with renamed variables
CREATE OR REPLACE FUNCTION public.update_weekly_usage_on_stream_end()
RETURNS TRIGGER AS $$
DECLARE
    stream_duration_minutes INTEGER;
    stream_week_start_date DATE;
    current_week_start_date DATE;
BEGIN
    -- Only process when a stream is marked as ended
    IF NEW.status = 'ended' AND OLD.status != 'ended' THEN
        -- Calculate stream duration in minutes
        IF NEW.started_at IS NOT NULL AND NEW.ended_at IS NOT NULL THEN
            stream_duration_minutes := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
        ELSE
            stream_duration_minutes := 0;
        END IF;
        
        -- Get the start of the week for the stream start date
        stream_week_start_date := DATE_TRUNC('week', NEW.started_at)::DATE;
        
        -- Get current week start (Monday)
        current_week_start_date := DATE_TRUNC('week', CURRENT_DATE)::DATE;
        
        -- Only record if the stream was in the current week
        IF stream_week_start_date = current_week_start_date THEN
            -- Insert or update weekly usage record
            INSERT INTO public.weekly_usage (user_id, week_start_date, streamed_minutes, updated_at)
            VALUES (NEW.streamer_id, stream_week_start_date, stream_duration_minutes, NOW())
            ON CONFLICT (user_id, week_start_date)
            DO UPDATE SET 
                streamed_minutes = weekly_usage.streamed_minutes + EXCLUDED.streamed_minutes,
                updated_at = NOW();
                
            RAISE NOTICE 'Updated weekly usage for user %: added % minutes, total: %', 
                NEW.streamer_id, 
                stream_duration_minutes,
                (SELECT streamed_minutes FROM public.weekly_usage WHERE user_id = NEW.streamer_id AND week_start_date = stream_week_start_date);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger
CREATE TRIGGER trigger_update_weekly_usage_on_stream_end
    AFTER UPDATE ON public.livestreams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_weekly_usage_on_stream_end();

-- 4. Verify the trigger is created
SELECT 
    'Trigger verification' as step,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'livestreams'
AND trigger_name = 'trigger_update_weekly_usage_on_stream_end';

-- 5. Test the function with a sample update (optional)
-- This will test if the function compiles correctly
SELECT 
    'Function test' as step,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'update_weekly_usage_on_stream_end'; 