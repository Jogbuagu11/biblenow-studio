-- Fix the streaming limit function to use subscription plan limits
-- This will get the actual streaming limit from the user's subscription plan

CREATE OR REPLACE FUNCTION streaming_get_user_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_limit integer;
BEGIN
    -- Get user's streaming limit from their subscription plan
    SELECT sp.streaming_minutes_limit
    INTO user_limit
    FROM verified_profiles vp
    JOIN subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE vp.id = user_id_param;
    
    -- If no plan found or user has no subscription, default to 0 (no streaming)
    IF user_limit IS NULL THEN
        user_limit := 0;
    END IF;
    
    RETURN user_limit;
END;
$$;

-- Test the updated function
SELECT 'Testing subscription-based streaming limit:' as test_name;
SELECT streaming_get_user_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as streaming_limit;

-- Also check what subscription plan the user has
SELECT 'User subscription plan:' as test_name;
SELECT 
    vp.id,
    vp.subscription_plan_id,
    sp.name as plan_name,
    sp.streaming_minutes_limit,
    sp.price_usd
FROM verified_profiles vp
LEFT JOIN subscription_plans sp ON vp.subscription_plan_id = sp.id
WHERE vp.id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid;
