-- Create trigger to automatically sync weekly usage when livestreams are updated

-- Function to sync weekly usage when a stream is updated
CREATE OR REPLACE FUNCTION sync_weekly_usage_on_stream_update()
RETURNS TRIGGER AS $$
DECLARE
    current_week_start DATE;
    calculated_minutes INTEGER;
BEGIN
    -- Get the start of the current week (Monday)
    current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Only sync if the stream is in the current week
    IF NEW.started_at >= current_week_start AND NEW.started_at < current_week_start + INTERVAL '7 days' THEN
        -- Calculate total minutes from livestreams table for this week
        SELECT COALESCE(SUM(
            CASE 
                WHEN ended_at IS NOT NULL THEN 
                    EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
                WHEN is_live = true THEN 
                    EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
                ELSE 0
            END
        ), 0)::INTEGER INTO calculated_minutes
        FROM public.livestreams
        WHERE streamer_id = NEW.streamer_id
        AND started_at >= current_week_start
        AND started_at < current_week_start + INTERVAL '7 days';
        
        -- Update or insert the weekly usage record
        INSERT INTO public.livestream_weekly_usage (user_id, week_start_date, streamed_minutes)
        VALUES (NEW.streamer_id, current_week_start, calculated_minutes)
        ON CONFLICT (user_id, week_start_date)
        DO UPDATE SET 
            streamed_minutes = calculated_minutes,
            updated_at = NOW();
        
        RAISE NOTICE 'Auto-synced weekly usage for user %: % minutes', NEW.streamer_id, calculated_minutes;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS sync_weekly_usage_trigger ON public.livestreams;
CREATE TRIGGER sync_weekly_usage_trigger
    AFTER INSERT OR UPDATE OF started_at, ended_at, is_live
    ON public.livestreams
    FOR EACH ROW
    EXECUTE FUNCTION sync_weekly_usage_on_stream_update();

SELECT 'Auto-sync trigger created successfully!' as status;
