-- Add subscription_plan column to verified_profiles table
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'basic';

-- Update existing users to have a default subscription plan
UPDATE public.verified_profiles 
SET subscription_plan = 'basic' 
WHERE subscription_plan IS NULL;

-- Create index for subscription_plan for better performance
CREATE INDEX IF NOT EXISTS idx_verified_profiles_subscription_plan 
ON public.verified_profiles(subscription_plan);

-- Add constraint to ensure valid subscription plans
ALTER TABLE public.verified_profiles 
ADD CONSTRAINT verified_profiles_subscription_plan_check 
CHECK (subscription_plan IN ('basic', 'standard', 'premium'));

-- Update the default moderator user to have a premium plan for testing
UPDATE public.verified_profiles 
SET subscription_plan = 'premium' 
WHERE email = 'mrs.ogbuagu@gmail.com';

-- Show current subscription plan distribution
SELECT 
    subscription_plan,
    COUNT(*) as user_count
FROM public.verified_profiles 
GROUP BY subscription_plan
ORDER BY subscription_plan; 