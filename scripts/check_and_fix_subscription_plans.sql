-- Check and fix subscription plans in verified_profiles table

-- 1. Check current subscription plan distribution
SELECT 
    subscription_plan,
    COUNT(*) as user_count,
    STRING_AGG(email, ', ') as users
FROM public.verified_profiles 
GROUP BY subscription_plan
ORDER BY subscription_plan;

-- 2. Check for null or empty subscription plans
SELECT 
    id,
    email,
    first_name,
    last_name,
    subscription_plan,
    CASE 
        WHEN subscription_plan IS NULL THEN 'NULL'
        WHEN subscription_plan = '' THEN 'EMPTY'
        ELSE 'HAS_VALUE'
    END as plan_status
FROM public.verified_profiles 
WHERE subscription_plan IS NULL OR subscription_plan = '';

-- 3. Update null/empty subscription plans to 'Olive' (default plan)
UPDATE public.verified_profiles 
SET subscription_plan = 'Olive' 
WHERE subscription_plan IS NULL OR subscription_plan = '';

-- 4. Update the default moderator user to 'Cedar' for testing (highest tier)
UPDATE public.verified_profiles 
SET subscription_plan = 'Cedar' 
WHERE email = 'mrs.ogbuagu@gmail.com';

-- 5. Verify the changes
SELECT 
    id,
    email,
    first_name,
    last_name,
    subscription_plan
FROM public.verified_profiles 
ORDER BY email;

-- 6. Final subscription plan distribution
SELECT 
    subscription_plan,
    COUNT(*) as user_count
FROM public.verified_profiles 
GROUP BY subscription_plan
ORDER BY subscription_plan; 