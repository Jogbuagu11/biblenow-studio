-- Fix subscription_plans RLS policies for proper access
-- Run this in your Supabase SQL Editor

-- 1. Drop all existing policies on subscription_plans table
DROP POLICY IF EXISTS "Public can read subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;

-- 2. Create new policies

-- Allow public read access to subscription plans (needed for JOIN queries)
CREATE POLICY "Public can read subscription plans" 
ON public.subscription_plans
FOR SELECT 
USING (true);

-- Allow admins full access to subscription plans
CREATE POLICY "Admins can manage subscription plans" 
ON public.subscription_plans
FOR ALL 
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- 3. Verify the policies are created
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'subscription_plans'
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 4. Test the subscription plans table
SELECT * FROM public.subscription_plans LIMIT 5;

-- 5. Test the JOIN query
SELECT 
    vp.id,
    vp.email,
    vp.subscription_plan,
    vp.subscription_plan_id,
    sp.name as plan_name,
    sp.streaming_minutes_limit,
    sp.price_usd
FROM public.verified_profiles vp
LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
LIMIT 5; 