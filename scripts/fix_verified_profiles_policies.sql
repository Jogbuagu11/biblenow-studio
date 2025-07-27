-- Fix verified_profiles RLS policies for proper subscription plan access
-- Run this in your Supabase SQL Editor

-- 1. Drop all existing policies on verified_profiles table
DROP POLICY IF EXISTS "Admins can delete verified profiles" ON public.verified_profiles;
DROP POLICY IF EXISTS "Admins can insert verified profiles" ON public.verified_profiles;
DROP POLICY IF EXISTS "Admins can update all verified profiles" ON public.verified_profiles;
DROP POLICY IF EXISTS "Admins can view all verified profiles" ON public.verified_profiles;
DROP POLICY IF EXISTS "Public can read verified profile data" ON public.verified_profiles;
DROP POLICY IF EXISTS "Public can view verified profiles" ON public.verified_profiles;
DROP POLICY IF EXISTS "Users can insert own verified profile" ON public.verified_profiles;
DROP POLICY IF EXISTS "Users can read their own verified profile data" ON public.verified_profiles;
DROP POLICY IF EXISTS "Users can update own verified profile" ON public.verified_profiles;
DROP POLICY IF EXISTS "Users can update their own verified profile data" ON public.verified_profiles;
DROP POLICY IF EXISTS "Users can view own subscription plan ID" ON public.verified_profiles;
DROP POLICY IF EXISTS "Users can view own verified profile" ON public.verified_profiles;
DROP POLICY IF EXISTS "Users cannot update subscription plan ID directly" ON public.verified_profiles;

-- 2. Create new, clean policies

-- Allow public read access (needed for JOIN queries and general profile viewing)
CREATE POLICY "Public can read verified profiles" 
ON public.verified_profiles
FOR SELECT 
USING (true);

-- Allow users to update their own profile (but not subscription_plan_id)
CREATE POLICY "Users can update own profile" 
ON public.verified_profiles
FOR UPDATE 
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" 
ON public.verified_profiles
FOR INSERT 
WITH CHECK (auth.uid()::text = id::text);

-- Allow admins full access
CREATE POLICY "Admins have full access" 
ON public.verified_profiles
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
WHERE tablename = 'verified_profiles'
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 4. Test the JOIN query
-- This should now work properly
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