-- Add trigger function to notify followers when a livestream is created
CREATE OR REPLACE FUNCTION notify_followers_on_stream_create()
RETURNS TRIGGER AS $$
DECLARE
    streamer_name TEXT;
    follower_count INTEGER;
BEGIN
    -- Only send notifications for live streams (is_live = true)
    IF NEW.is_live = true THEN
        -- Get streamer's name
        SELECT 
            COALESCE(first_name || ' ' || last_name, 'Unknown Streamer')
        INTO streamer_name
        FROM verified_profiles 
        WHERE id = NEW.streamer_id;
        
        -- Insert notifications for all followers
        INSERT INTO notifications (user_id, type, title, body, metadata)
        SELECT 
            uf.follower_id,
            'streamer_live',
            streamer_name || ' is live!',
            streamer_name || ' started streaming: ' || NEW.title,
            jsonb_build_object(
                'stream_id', NEW.id,
                'streamer_id', NEW.streamer_id,
                'streamer_name', streamer_name,
                'stream_title', NEW.title,
                'stream_description', COALESCE(NEW.description, ''),
                'platform', COALESCE(NEW.platform, ''),
                'stream_mode', COALESCE(NEW.stream_mode, 'solo'),
                'livestream_type', COALESCE(NEW.stream_type, 'video'),
                'action', 'stream_started'
            )
        FROM user_follows uf
        WHERE uf.following_id = NEW.streamer_id;
        
        -- Get count of notifications created for logging
        GET DIAGNOSTICS follower_count = ROW_COUNT;
        
        -- Log the notification count (optional)
        RAISE NOTICE 'Sent live notifications to % followers for stream %', follower_count, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after a livestream is inserted
CREATE TRIGGER trigger_notify_followers_on_stream_create
  AFTER INSERT ON livestreams
  FOR EACH ROW
  EXECUTE FUNCTION notify_followers_on_stream_create();

-- Add comment for documentation
COMMENT ON FUNCTION notify_followers_on_stream_create() IS 'Automatically creates notifications for followers when a livestream is created';
COMMENT ON TRIGGER trigger_notify_followers_on_stream_create ON livestreams IS 'Triggers follower notifications when a new livestream is created'; 