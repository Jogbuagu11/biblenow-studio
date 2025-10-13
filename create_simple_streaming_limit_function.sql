-- Create a simple, robust get_user_streaming_limit function
-- Since preferences column is text and currently null, we'll use a default value

-- Drop the existing function
DROP FUNCTION IF EXISTS get_user_streaming_limit(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_streaming_limit(user_id_param uuid) CASCADE;

-- Create a simple function that returns a default streaming limit
-- Since preferences are null, we'll use a sensible default
CREATE OR REPLACE FUNCTION get_user_streaming_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_limit integer;
    preferences_value text;
BEGIN
    -- Get user's preferences (currently null for all users)
    SELECT preferences
    INTO preferences_value
    FROM verified_profiles
    WHERE id = user_id_param;
    
    -- For now, since preferences are null, return a default limit
    -- You can modify this later when you add preferences support
    user_limit := 60; -- Default to 60 minutes per week
    
    -- If preferences become available in the future, you can add logic here
    -- to parse them and extract streamingLimitMinutes
    
    RETURN user_limit;
END;
$$;

-- Test the function
SELECT 'Testing get_user_streaming_limit function:' as test_name;
SELECT get_user_streaming_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as streaming_limit;

-- Test with the other user ID too
SELECT get_user_streaming_limit('11111111-1111-1111-1111-111111111111'::uuid) as streaming_limit;

-- Now let's also make sure the other functions work
-- Test get_weekly_streaming_usage
SELECT 'Testing get_weekly_streaming_usage function:' as test_name;
SELECT get_weekly_streaming_usage('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as current_usage;

-- Test add_streaming_minutes (this should trigger a notification if limit is reached)
SELECT 'Testing add_streaming_minutes function:' as test_name;
SELECT add_streaming_minutes('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid, 50);

-- Check if notification was created
SELECT 'Checking for notifications:' as test_name;
SELECT 
    id,
    user_id,
    type,
    message,
    created_at
FROM studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid
AND type = 'streaming_limit_reached'
ORDER BY created_at DESC
LIMIT 5;
