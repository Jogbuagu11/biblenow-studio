-- Check what subscription plans are available and their streaming limits

SELECT 'Available subscription plans:' as info;
SELECT 
    id,
    name,
    streaming_minutes_limit,
    price_usd,
    features
FROM subscription_plans
ORDER BY streaming_minutes_limit;

-- Check if the test user has a subscription plan assigned
SELECT 'Test user subscription:' as info;
SELECT 
    vp.id,
    vp.subscription_plan_id,
    sp.name as plan_name,
    sp.streaming_minutes_limit,
    sp.price_usd
FROM verified_profiles vp
LEFT JOIN subscription_plans sp ON vp.subscription_plan_id = sp.id
WHERE vp.id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid;
