-- Add jaas_password field to existing verified_profiles table
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS jaas_password VARCHAR(255) DEFAULT 'biblenow123';

-- Update all existing users to have the default password
UPDATE public.verified_profiles 
SET jaas_password = 'biblenow123' 
WHERE jaas_password IS NULL;

-- Make jaas_password field NOT NULL after setting default values
ALTER TABLE public.verified_profiles 
ALTER COLUMN jaas_password SET NOT NULL; 