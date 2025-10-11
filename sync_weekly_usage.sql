-- Sync Weekly Usage for Current Week
-- This script ensures all streams from the current week are properly recorded in weekly usage

-- Function to sync weekly usage for a specific user and week
CREATE OR REPLACE FUNCTION sync_user_weekly_usage(
    target_user_id UUID,
    target_week_start DATE DEFAULT NULL
)
RETURNS TABLE(
    stream_id UUID,
    stream_title TEXT,
    streamed_minutes INTEGER,
    status TEXT,
    week_start_date DATE
) AS $$
DECLARE
    week_start DATE;
    stream_record RECORD;
    calculated_minutes INTEGER;
BEGIN
    -- Use provided week or current week
    IF target_week_start IS NULL THEN
        week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    ELSE
        week_start := target_week_start;
    END IF;
    
    RAISE NOTICE 'Syncing weekly usage for user % for week starting %', target_user_id, week_start;
    
    -- Get all streams for this user from this week
    FOR stream_record IN 
        SELECT 
            id,
            title,
            started_at,
            ended_at,
            status,
            is_live
        FROM public.livestreams
        WHERE streamer_id = target_user_id
        AND started_at >= week_start
        AND started_at < week_start + INTERVAL '7 days'
        ORDER BY started_at
    LOOP
        -- Calculate duration
        IF stream_record.ended_at IS NOT NULL THEN
            calculated_minutes := EXTRACT(EPOCH FROM (stream_record.ended_at - stream_record.started_at))::INTEGER / 60;
        ELSE
            -- Active stream - calculate up to now
            calculated_minutes := EXTRACT(EPOCH FROM (NOW() - stream_record.started_at))::INTEGER / 60;
        END IF;
        
        -- Only process if we have valid duration
        IF calculated_minutes > 0 THEN
            -- Insert or update weekly usage record
            INSERT INTO public.livestream_weekly_usage (
                user_id, 
                week_start_date, 
                streamed_minutes, 
                stream_count,
                updated_at
            )
            VALUES (
                target_user_id, 
                week_start, 
                calculated_minutes, 
                1,
                NOW()
            )
            ON CONFLICT (user_id, week_start_date)
            DO UPDATE SET
                streamed_minutes = livestream_weekly_usage.streamed_minutes + EXCLUDED.streamed_minutes,
                stream_count = livestream_weekly_usage.stream_count + 1,
                updated_at = NOW();
            
            -- Return the processed stream info
            stream_id := stream_record.id;
            stream_title := stream_record.title;
            streamed_minutes := calculated_minutes;
            status := COALESCE(stream_record.status, 'unknown');
            week_start_date := week_start;
            RETURN NEXT;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Weekly usage sync completed for user %', target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync all users for current week
CREATE OR REPLACE FUNCTION sync_all_users_weekly_usage()
RETURNS TABLE(
    user_id UUID,
    streams_processed INTEGER,
    total_minutes INTEGER
) AS $$
DECLARE
    user_record RECORD;
    week_start DATE;
    processed_count INTEGER;
    total_mins INTEGER;
BEGIN
    week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    RAISE NOTICE 'Syncing weekly usage for all users for week starting %', week_start;
    
    -- Get all users who have streamed this week
    FOR user_record IN 
        SELECT DISTINCT streamer_id
        FROM public.livestreams
        WHERE started_at >= week_start
        AND started_at < week_start + INTERVAL '7 days'
    LOOP
        -- Sync this user's weekly usage
        SELECT 
            COUNT(*)::INTEGER,
            COALESCE(SUM(streamed_minutes), 0)::INTEGER
        INTO processed_count, total_mins
        FROM sync_user_weekly_usage(user_record.streamer_id, week_start);
        
        user_id := user_record.streamer_id;
        streams_processed := processed_count;
        total_minutes := total_mins;
        RETURN NEXT;
    END LOOP;
    
    RAISE NOTICE 'Weekly usage sync completed for all users';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION sync_user_weekly_usage(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_all_users_weekly_usage() TO authenticated;

-- Test the sync function (replace with actual user ID)
-- SELECT * FROM sync_user_weekly_usage('your-user-id-here'::UUID);

-- Or sync all users
-- SELECT * FROM sync_all_users_weekly_usage();

SELECT 'Weekly usage sync functions created successfully!' as status;
