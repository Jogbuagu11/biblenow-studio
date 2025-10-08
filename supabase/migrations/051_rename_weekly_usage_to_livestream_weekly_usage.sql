-- Rename weekly_usage table to livestream_weekly_usage
-- This migration renames the table and updates all related objects

-- 1. Rename the table
ALTER TABLE public.weekly_usage RENAME TO livestream_weekly_usage;

-- 2. Rename the primary key constraint
ALTER TABLE public.livestream_weekly_usage RENAME CONSTRAINT weekly_usage_pkey TO livestream_weekly_usage_pkey;

-- 3. Rename the unique constraint
ALTER TABLE public.livestream_weekly_usage RENAME CONSTRAINT weekly_usage_user_id_week_start_date_key TO livestream_weekly_usage_user_id_week_start_date_key;

-- 4. Rename the foreign key constraint
ALTER TABLE public.livestream_weekly_usage RENAME CONSTRAINT weekly_usage_user_id_fkey TO livestream_weekly_usage_user_id_fkey;

-- 5. Rename the index
ALTER INDEX public.idx_weekly_usage_user_week RENAME TO idx_livestream_weekly_usage_user_week;

-- 6. Update the trigger function to use the new table name
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
            INSERT INTO public.livestream_weekly_usage (user_id, week_start_date, streamed_minutes, updated_at)
            VALUES (NEW.streamer_id, week_start_date, stream_duration_minutes, NOW())
            ON CONFLICT (user_id, week_start_date)
            DO UPDATE SET 
                streamed_minutes = livestream_weekly_usage.streamed_minutes + EXCLUDED.streamed_minutes,
                updated_at = NOW();
                
            RAISE NOTICE 'Updated weekly usage for user %: added % minutes, total: %', 
                NEW.streamer_id, 
                stream_duration_minutes,
                (SELECT streamed_minutes FROM public.livestream_weekly_usage WHERE user_id = NEW.streamer_id AND week_start_date = week_start_date);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Update the initialization function to use the new table name
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
        INSERT INTO public.livestream_weekly_usage (user_id, week_start_date, streamed_minutes, updated_at)
        VALUES (stream_record.streamer_id, week_start_date, stream_duration_minutes, NOW())
        ON CONFLICT (user_id, week_start_date)
        DO UPDATE SET 
            streamed_minutes = livestream_weekly_usage.streamed_minutes + EXCLUDED.streamed_minutes,
            updated_at = NOW();
    END LOOP;
    
    RAISE NOTICE 'Initialized weekly usage for existing streams in current week';
END;
$$ LANGUAGE plpgsql;

-- 8. Update RLS policies (if any exist)
-- Note: RLS policies will be automatically updated when the table is renamed
-- But we should verify they exist and are working correctly

-- 9. Add comment to the table
COMMENT ON TABLE public.livestream_weekly_usage IS 'Tracks weekly streaming usage per user for livestreams';
