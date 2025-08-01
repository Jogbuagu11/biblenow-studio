-- Add stripe_account_id column to verified_profiles table
-- This allows users to connect their existing Stripe accounts

-- Add stripe_account_id column
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);

-- Create index for stripe_account_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_verified_profiles_stripe_account_id 
ON public.verified_profiles(stripe_account_id);

-- Add unique constraint to prevent multiple users from connecting the same Stripe account
ALTER TABLE public.verified_profiles 
ADD CONSTRAINT IF NOT EXISTS unique_stripe_account_id 
UNIQUE (stripe_account_id);

-- Add comment for documentation
COMMENT ON COLUMN public.verified_profiles.stripe_account_id IS 'Connected Stripe account ID for receiving donations'; 