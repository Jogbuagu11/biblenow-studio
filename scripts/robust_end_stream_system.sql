-- Robust End Stream System
-- This script implements a comprehensive solution to ensure livestreams are properly ended
-- Run this in your Supabase SQL Editor

-- 1. First, let's clean up any existing orphaned streams
UPDATE public.livestreams 
SET 
    is_live = false,
    status = 'ended',
    ended_at = CASE 
        WHEN ended_at IS NULL THEN NOW()
        ELSE ended_at
    END,
    updated_at = NOW()
WHERE is_live = true OR status NOT IN ('active', 'ended');

-- 2. Create a comprehensive function to end streams
CREATE OR REPLACE FUNCTION end_stream_comprehensive(
    p_stream_id UUID DEFAULT NULL,
    p_streamer_id UUID DEFAULT NULL,
    p_force_end_all BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
    affected_streams INTEGER := 0;
    stream_record RECORD;
    result JSON;
BEGIN
    -- If force_end_all is true, end all active streams
    IF p_force_end_all THEN
        UPDATE public.livestreams 
        SET 
            is_live = false,
            status = 'ended',
            ended_at = CASE 
                WHEN ended_at IS NULL THEN NOW()
                ELSE ended_at
            END,
            updated_at = NOW()
        WHERE is_live = true OR status = 'active';
        
        GET DIAGNOSTICS affected_streams = ROW_COUNT;
        
        result := json_build_object(
            'success', true,
            'message', 'Ended all active streams',
            'affected_streams', affected_streams
        );
        
    -- If specific stream ID is provided
    ELSIF p_stream_id IS NOT NULL THEN
        UPDATE public.livestreams 
        SET 
            is_live = false,
            status = 'ended',
            ended_at = CASE 
                WHEN ended_at IS NULL THEN NOW()
                ELSE ended_at
            END,
            updated_at = NOW()
        WHERE id = p_stream_id AND (is_live = true OR status = 'active');
        
        GET DIAGNOSTICS affected_streams = ROW_COUNT;
        
        IF affected_streams > 0 THEN
            result := json_build_object(
                'success', true,
                'message', 'Stream ended successfully',
                'stream_id', p_stream_id,
                'affected_streams', affected_streams
            );
        ELSE
            result := json_build_object(
                'success', false,
                'message', 'Stream not found or already ended',
                'stream_id', p_stream_id
            );
        END IF;
        
    -- If streamer_id is provided, end all their active streams
    ELSIF p_streamer_id IS NOT NULL THEN
        UPDATE public.livestreams 
        SET 
            is_live = false,
            status = 'ended',
            ended_at = CASE 
                WHEN ended_at IS NULL THEN NOW()
                ELSE ended_at
            END,
            updated_at = NOW()
        WHERE streamer_id = p_streamer_id AND (is_live = true OR status = 'active');
        
        GET DIAGNOSTICS affected_streams = ROW_COUNT;
        
        result := json_build_object(
            'success', true,
            'message', 'Ended all active streams for user',
            'streamer_id', p_streamer_id,
            'affected_streams', affected_streams
        );
        
    ELSE
        result := json_build_object(
            'success', false,
            'message', 'No parameters provided'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a function to automatically end streams after a timeout
CREATE OR REPLACE FUNCTION auto_end_inactive_streams()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER := 0;
    timeout_hours INTEGER := 24; -- End streams that have been inactive for 24 hours
BEGIN
    UPDATE public.livestreams 
    SET 
        is_live = false,
        status = 'ended',
        ended_at = CASE 
            WHEN ended_at IS NULL THEN NOW()
            ELSE ended_at
        END,
        updated_at = NOW()
    WHERE (is_live = true OR status = 'active')
    AND started_at < NOW() - INTERVAL '1 hour' * timeout_hours;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    IF affected_count > 0 THEN
        RAISE NOTICE 'Auto-ended % inactive streams', affected_count;
    END IF;
    
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a function to end streams when user disconnects
CREATE OR REPLACE FUNCTION end_stream_on_user_disconnect(p_streamer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    stream_exists BOOLEAN;
BEGIN
    -- Check if user has any active streams
    SELECT EXISTS(
        SELECT 1 FROM public.livestreams 
        WHERE streamer_id = p_streamer_id 
        AND (is_live = true OR status = 'active')
    ) INTO stream_exists;
    
    IF stream_exists THEN
        -- End all active streams for this user
        PERFORM end_stream_comprehensive(p_streamer_id => p_streamer_id);
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a function to get stream status
CREATE OR REPLACE FUNCTION get_stream_status(p_stream_id UUID)
RETURNS JSON AS $$
DECLARE
    stream_data RECORD;
BEGIN
    SELECT 
        id,
        title,
        streamer_id,
        is_live,
        status,
        started_at,
        ended_at,
        CASE 
            WHEN started_at IS NOT NULL AND ended_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
            ELSE 0 
        END as duration_minutes,
        updated_at
    INTO stream_data
    FROM public.livestreams 
    WHERE id = p_stream_id;
    
    IF stream_data IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Stream not found'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'stream', to_json(stream_data)
    );
END;
$$ LANGUAGE plpgsql;

-- 6. Create a function to list all active streams
CREATE OR REPLACE FUNCTION list_active_streams()
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    streamer_id UUID,
    streamer_email VARCHAR,
    started_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    is_live BOOLEAN,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.streamer_id,
        vp.email as streamer_email,
        l.started_at,
        CASE 
            WHEN l.started_at IS NOT NULL AND l.ended_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (l.ended_at - l.started_at)) / 60
            WHEN l.started_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (NOW() - l.started_at)) / 60
            ELSE 0 
        END as duration_minutes,
        l.is_live,
        l.status
    FROM public.livestreams l
    LEFT JOIN public.verified_profiles vp ON l.streamer_id = vp.id
    WHERE l.is_live = true OR l.status = 'active'
    ORDER BY l.started_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. Create a cron job function to auto-end inactive streams (if you have pg_cron extension)
-- Uncomment if you have pg_cron extension installed
/*
SELECT cron.schedule(
    'auto-end-inactive-streams',
    '0 */6 * * *', -- Every 6 hours
    'SELECT auto_end_inactive_streams();'
);
*/

-- 8. Test the functions
DO $$
DECLARE
    test_result JSON;
BEGIN
    -- Test listing active streams
    RAISE NOTICE '=== Active Streams ===';
    FOR stream_record IN SELECT * FROM list_active_streams() LIMIT 5 LOOP
        RAISE NOTICE 'Stream: % - % - Live: % - Status: %', 
            stream_record.id, 
            stream_record.title, 
            stream_record.is_live, 
            stream_record.status;
    END LOOP;
    
    -- Test comprehensive end function
    RAISE NOTICE '=== Testing End Stream Functions ===';
    test_result := end_stream_comprehensive(p_force_end_all => false);
    RAISE NOTICE 'Test result: %', test_result;
    
    -- Test auto-end function
    RAISE NOTICE '=== Testing Auto-End Function ===';
    PERFORM auto_end_inactive_streams();
    
END $$;

-- 9. Show current status
SELECT 
    'Current Stream Status' as info,
    COUNT(*) as total_streams,
    COUNT(CASE WHEN is_live = true THEN 1 END) as live_streams,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_streams,
    COUNT(CASE WHEN status = 'ended' THEN 1 END) as ended_streams
FROM public.livestreams;

-- 10. Show recent streams
SELECT 
    id,
    title,
    streamer_id,
    started_at,
    ended_at,
    is_live,
    status,
    CASE 
        WHEN started_at IS NOT NULL AND ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
        WHEN started_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
        ELSE 0 
    END as duration_minutes
FROM public.livestreams 
ORDER BY updated_at DESC
LIMIT 10; 