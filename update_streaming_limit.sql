-- Update the streaming limit to a different value
-- Change 60 to whatever limit you want (in minutes)

CREATE OR REPLACE FUNCTION streaming_get_user_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Change this number to set the default streaming limit
    -- Examples: 120 = 2 hours, 180 = 3 hours, 300 = 5 hours, 600 = 10 hours
    RETURN 120; -- 2 hours per week
END;
$$;

-- Test the new limit
SELECT 'New streaming limit:' as test_name;
SELECT streaming_get_user_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as streaming_limit;
