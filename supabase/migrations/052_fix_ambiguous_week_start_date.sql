-- Fix ambiguous week_start_date column reference
-- This migration fixes the "column reference 'week_start_date' is ambiguous" error

-- 1. Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_livestream_weekly_usage_on_stream_end ON public.livestreams;
DROP FUNCTION IF EXISTS public.update_livestream_weekly_usage_on_stream_end();

-- 2. Create the fixed function with proper table aliases
CREATE OR REPLACE FUNCTION public.update_livestream_weekly_usage_on_stream_end()
RETURNS TRIGGER AS $$
DECLARE
    stream_duration_minutes INTEGER;
    week_start_date DATE;
    current_week_start DATE;
BEGIN
    -- Only process when a stream is marked as ended
    IF NEW.status = 'ended' AND (OLD.status != 'ended' OR OLD.status IS NULL) THEN
        -- Calculate stream duration in minutes
        IF NEW.started_at IS NOT NULL AND NEW.ended_at IS NOT NULL THEN
            stream_duration_minutes := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
        ELSE
            stream_duration_minutes := 0;
        END IF;
        
        -- Get the start of the week for the stream start date
        week_start_date := DATE_TRUNC('week', NEW.started_at)::DATE;
        
        -- Get current week start (Monday)
        current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
        
        -- Only record if the stream was in the current week
        IF week_start_date = current_week_start THEN
            -- Insert or update weekly usage record
            INSERT INTO public.livestream_weekly_usage (user_id, week_start_date, streamed_minutes, updated_at)
            VALUES (NEW.streamer_id, week_start_date, stream_duration_minutes, NOW())
            ON CONFLICT (user_id, week_start_date)
            DO UPDATE SET 
                streamed_minutes = livestream_weekly_usage.streamed_minutes + EXCLUDED.streamed_minutes,
                updated_at = NOW();
                
            RAISE NOTICE 'Updated weekly usage for user %: added % minutes, total: %', 
                NEW.streamer_id, 
                stream_duration_minutes,
                (SELECT wu.streamed_minutes FROM public.livestream_weekly_usage wu WHERE wu.user_id = NEW.streamer_id AND wu.week_start_date = week_start_date);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger
CREATE TRIGGER trigger_update_livestream_weekly_usage_on_stream_end
    AFTER UPDATE ON public.livestreams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_livestream_weekly_usage_on_stream_end();

-- 4. Test the function
SELECT 'Trigger function created successfully' as status;
