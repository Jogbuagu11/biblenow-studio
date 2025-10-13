-- Make streaming limit configurable per user
-- This will check user preferences first, then fall back to a default

CREATE OR REPLACE FUNCTION streaming_get_user_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_limit integer;
    preferences_value text;
BEGIN
    -- Get user's preferences
    SELECT preferences
    INTO preferences_value
    FROM verified_profiles
    WHERE id = user_id_param;
    
    -- Try to extract streamingLimitMinutes from preferences
    -- If preferences are null or don't contain the setting, use default
    IF preferences_value IS NOT NULL AND preferences_value::text ~ 'streamingLimitMinutes' THEN
        -- Try to parse the preferences (assuming it's JSON-like)
        -- This is a simple approach - you might need to adjust based on your preferences format
        BEGIN
            user_limit := (preferences_value::jsonb->>'streamingLimitMinutes')::integer;
        EXCEPTION
            WHEN OTHERS THEN
                user_limit := 120; -- Default to 2 hours
        END;
    ELSE
        user_limit := 120; -- Default to 2 hours per week
    END IF;
    
    -- Ensure we have a valid limit (minimum 30 minutes, maximum 10080 minutes = 1 week)
    user_limit := GREATEST(30, LEAST(COALESCE(user_limit, 120), 10080));
    
    RETURN user_limit;
END;
$$;

-- Test the configurable limit
SELECT 'Configurable streaming limit:' as test_name;
SELECT streaming_get_user_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as streaming_limit;
