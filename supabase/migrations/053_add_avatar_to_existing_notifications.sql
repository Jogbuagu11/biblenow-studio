-- Update existing notifications to include streamer avatars
-- This migration adds streamer_avatar to existing notifications that don't have it

-- Function to update existing notifications with streamer avatars
CREATE OR REPLACE FUNCTION update_existing_notifications_with_avatars()
RETURNS void AS $$
DECLARE
    notification_record RECORD;
    streamer_avatar TEXT;
BEGIN
    -- Loop through all streamer_live notifications that don't have streamer_avatar
    FOR notification_record IN 
        SELECT n.id, n.metadata, n.metadata->>'streamer_id' as streamer_id
        FROM notifications n
        WHERE n.type = 'streamer_live' 
        AND (n.metadata->>'streamer_avatar' IS NULL OR n.metadata->>'streamer_avatar' = '')
    LOOP
        -- Get the streamer's avatar from verified_profiles (only profile_photo_url exists)
        SELECT profile_photo_url
        INTO streamer_avatar
        FROM verified_profiles
        WHERE id = notification_record.streamer_id::uuid;
        
        -- Update the notification metadata to include the avatar
        IF streamer_avatar IS NOT NULL THEN
            UPDATE notifications
            SET metadata = jsonb_set(
                metadata, 
                '{streamer_avatar}', 
                to_jsonb(streamer_avatar)
            )
            WHERE id = notification_record.id;
            
            RAISE NOTICE 'Updated notification % with avatar for streamer %', 
                notification_record.id, notification_record.streamer_id;
        ELSE
            RAISE NOTICE 'No avatar found for streamer % in notification %', 
                notification_record.streamer_id, notification_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Finished updating existing notifications with avatars';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to update existing notifications
SELECT update_existing_notifications_with_avatars();

-- Drop the function after use
DROP FUNCTION update_existing_notifications_with_avatars();

-- Add comment for documentation
COMMENT ON FUNCTION update_existing_notifications_with_avatars() IS 'Updates existing streamer_live notifications to include streamer avatars'; 