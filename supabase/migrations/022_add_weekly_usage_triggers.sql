-- Add triggers to automatically update weekly_usage table when streams end
-- Run this in your Supabase SQL Editor

-- 1. Create function to calculate and update weekly usage
CREATE OR REPLACE FUNCTION public.update_weekly_usage_on_stream_end()
RETURNS TRIGGER AS $$
DECLARE
    stream_duration_minutes INTEGER;
    week_start_date DATE;
    current_week_start DATE;
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
        week_start_date := DATE_TRUNC('week', NEW.started_at)::DATE;
        
        -- Get current week start (Monday)
        current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
        
        -- Only record if the stream was in the current week
        IF week_start_date = current_week_start THEN
            -- Insert or update weekly usage record
            INSERT INTO public.weekly_usage (user_id, week_start_date, streamed_minutes, updated_at)
            VALUES (NEW.streamer_id, week_start_date, stream_duration_minutes, NOW())
            ON CONFLICT (user_id, week_start_date)
            DO UPDATE SET 
                streamed_minutes = weekly_usage.streamed_minutes + EXCLUDED.streamed_minutes,
                updated_at = NOW();
                
            RAISE NOTICE 'Updated weekly usage for user %: added % minutes, total: %', 
                NEW.streamer_id, 
                stream_duration_minutes,
                (SELECT streamed_minutes FROM public.weekly_usage WHERE user_id = NEW.streamer_id AND week_start_date = week_start_date);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger on livestreams table
DROP TRIGGER IF EXISTS trigger_update_weekly_usage_on_stream_end ON public.livestreams;
CREATE TRIGGER trigger_update_weekly_usage_on_stream_end
    AFTER UPDATE ON public.livestreams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_weekly_usage_on_stream_end();

-- 3. Create function to initialize weekly usage for existing users
CREATE OR REPLACE FUNCTION public.initialize_weekly_usage_for_existing_streams()
RETURNS void AS $$
DECLARE
    stream_record RECORD;
    week_start_date DATE;
    stream_duration_minutes INTEGER;
BEGIN
    -- Process all completed streams from the current week
    FOR stream_record IN 
        SELECT 
            streamer_id,
            started_at,
            ended_at,
            status
        FROM public.livestreams 
        WHERE status = 'ended'
        AND started_at >= DATE_TRUNC('week', CURRENT_DATE)
        AND started_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
        AND started_at IS NOT NULL 
        AND ended_at IS NOT NULL
    LOOP
        -- Calculate stream duration
        stream_duration_minutes := EXTRACT(EPOCH FROM (stream_record.ended_at - stream_record.started_at)) / 60;
        
        -- Get week start date
        week_start_date := DATE_TRUNC('week', stream_record.started_at)::DATE;
        
        -- Insert or update weekly usage
        INSERT INTO public.weekly_usage (user_id, week_start_date, streamed_minutes, updated_at)
        VALUES (stream_record.streamer_id, week_start_date, stream_duration_minutes, NOW())
        ON CONFLICT (user_id, week_start_date)
        DO UPDATE SET 
            streamed_minutes = weekly_usage.streamed_minutes + EXCLUDED.streamed_minutes,
            updated_at = NOW();
    END LOOP;
    
    RAISE NOTICE 'Initialized weekly usage for existing streams in current week';
END;
$$ LANGUAGE plpgsql;

-- 4. Run the initialization function
SELECT public.initialize_weekly_usage_for_existing_streams();

-- 5. Verify the trigger is created
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'livestreams'
AND trigger_name = 'trigger_update_weekly_usage_on_stream_end';

-- 6. Show current weekly usage data
SELECT 
    wu.user_id,
    vp.email,
    wu.week_start_date,
    wu.streamed_minutes,
    wu.updated_at
FROM public.weekly_usage wu
JOIN public.verified_profiles vp ON wu.user_id = vp.id
ORDER BY wu.week_start_date DESC, wu.streamed_minutes DESC; 