-- Check and fix Cedar plan linkage
DO $$
DECLARE
    cedar_plan_id UUID;
BEGIN
    -- Get the Cedar plan ID
    SELECT id INTO cedar_plan_id
    FROM public.subscription_plans
    WHERE name = 'Cedar';

    -- Update any Cedar users that don't have the correct subscription_plan_id
    UPDATE public.verified_profiles
    SET subscription_plan_id = cedar_plan_id
    WHERE subscription_plan = 'Cedar'
    AND (subscription_plan_id IS NULL OR subscription_plan_id != cedar_plan_id);

    -- Log the changes
    RAISE NOTICE 'Updated Cedar plan linkage. Cedar plan ID: %', cedar_plan_id;
END;
$$;

-- Verify the changes
SELECT 
    vp.id,
    vp.email,
    vp.subscription_plan,
    vp.subscription_plan_id,
    sp.name as linked_plan_name,
    sp.streaming_minutes_limit
FROM public.verified_profiles vp
LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
WHERE vp.subscription_plan = 'Cedar';
