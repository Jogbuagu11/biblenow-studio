-- Sync weekly streaming usage from livestreams table to livestream_weekly_usage table

-- Function to sync weekly usage for a specific user
CREATE OR REPLACE FUNCTION sync_user_weekly_usage(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    current_week_start DATE;
    calculated_minutes INTEGER;
    existing_minutes INTEGER;
BEGIN
    -- Get the start of the current week (Monday)
    current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
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
    WHERE streamer_id = p_user_id
    AND started_at >= current_week_start
    AND started_at < current_week_start + INTERVAL '7 days';
    
    -- Get existing minutes from weekly usage table
    SELECT COALESCE(streamed_minutes, 0) INTO existing_minutes
    FROM public.livestream_weekly_usage
    WHERE user_id = p_user_id
    AND week_start_date = current_week_start;
    
    -- Update or insert the weekly usage record
    INSERT INTO public.livestream_weekly_usage (user_id, week_start_date, streamed_minutes)
    VALUES (p_user_id, current_week_start, calculated_minutes)
    ON CONFLICT (user_id, week_start_date)
    DO UPDATE SET 
        streamed_minutes = calculated_minutes,
        updated_at = NOW();
    
    RAISE NOTICE 'Synced weekly usage for user %: % minutes (was %)', 
        p_user_id, calculated_minutes, existing_minutes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync weekly usage for all users
CREATE OR REPLACE FUNCTION sync_all_weekly_usage()
RETURNS VOID AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Loop through all users who have streams this week
    FOR user_record IN 
        SELECT DISTINCT streamer_id as user_id
        FROM public.livestreams
        WHERE started_at >= DATE_TRUNC('week', CURRENT_DATE)::DATE
        AND started_at < DATE_TRUNC('week', CURRENT_DATE)::DATE + INTERVAL '7 days'
    LOOP
        PERFORM sync_user_weekly_usage(user_record.user_id);
    END LOOP;
    
    RAISE NOTICE 'Synced weekly usage for all users';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sync the specific user's data
SELECT sync_user_weekly_usage('29a4414e-d60f-42c1-bbfd-9166f17211a0'::UUID);

-- Check the result
SELECT 
    user_id,
    week_start_date,
    streamed_minutes,
    created_at,
    updated_at
FROM public.livestream_weekly_usage 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
ORDER BY week_start_date DESC;