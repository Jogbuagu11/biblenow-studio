-- Fix the get_user_streaming_limit function to handle different preference column types

-- First, drop the existing function
DROP FUNCTION IF EXISTS get_user_streaming_limit(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_streaming_limit(user_id_param uuid) CASCADE;

-- Create a more robust function that handles different preference column types
CREATE OR REPLACE FUNCTION get_user_streaming_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_limit integer;
    preferences_value text;
BEGIN
    -- Get user's streaming limit from verified_profiles
    -- Handle different possible types for preferences column
    SELECT preferences::text
    INTO preferences_value
    FROM verified_profiles
    WHERE id = user_id_param;
    
    -- Try to extract streamingLimitMinutes from the preferences
    -- If preferences is JSON/JSONB, extract the value
    -- If it's text, try to parse it
    -- If it's null or doesn't contain the key, use default
    BEGIN
        -- Try to extract from JSON if it's valid JSON
        IF preferences_value IS NOT NULL AND preferences_value::text ~ '^[\s]*[\{\[]' THEN
            -- It looks like JSON, try to extract the value
            SELECT COALESCE((preferences_value::jsonb->>'streamingLimitMinutes')::integer, 60)
            INTO user_limit;
        ELSE
            -- Not JSON, use default value
            user_limit := 60;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- If any error occurs, use default value
            user_limit := 60;
    END;
    
    -- Ensure we have a valid limit (minimum 1 minute, maximum 10080 minutes = 1 week)
    user_limit := GREATEST(1, LEAST(COALESCE(user_limit, 60), 10080));
    
    RETURN user_limit;
END;
$$;

-- Test the function
SELECT 'Testing get_user_streaming_limit function:' as test_name;
SELECT get_user_streaming_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as streaming_limit;

-- Also test with a few other user IDs to make sure it works
SELECT 
    id,
    get_user_streaming_limit(id) as streaming_limit,
    preferences
FROM verified_profiles 
LIMIT 3;
