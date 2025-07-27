-- Fix subscription_plan_id foreign key relationship
-- Run this in your Supabase SQL Editor

-- 1. First, let's check if the subscription_plan_id column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'verified_profiles' 
AND column_name = 'subscription_plan_id';

-- 2. Add subscription_plan_id column if it doesn't exist
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS subscription_plan_id UUID;

-- 3. Create foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'verified_profiles_subscription_plan_id_fkey'
        AND table_name = 'verified_profiles'
    ) THEN
        ALTER TABLE public.verified_profiles 
        ADD CONSTRAINT verified_profiles_subscription_plan_id_fkey 
        FOREIGN KEY (subscription_plan_id) 
        REFERENCES public.subscription_plans(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_verified_profiles_subscription_plan_id 
ON public.verified_profiles(subscription_plan_id);

-- 5. Update existing records to link subscription_plan to subscription_plan_id
-- This assumes that subscription_plan contains the plan name and we need to find the corresponding ID
UPDATE public.verified_profiles 
SET subscription_plan_id = sp.id
FROM public.subscription_plans sp
WHERE verified_profiles.subscription_plan = sp.name
AND verified_profiles.subscription_plan_id IS NULL;

-- 6. Verify the foreign key relationship
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