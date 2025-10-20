-- Add payout tracking fields to verified_profiles table
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS payouts_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_payout_date timestamp without time zone null,
ADD COLUMN IF NOT EXISTS next_payout_date timestamp without time zone null,
ADD COLUMN IF NOT EXISTS total_payouts_usd integer DEFAULT 0, -- Total payouts in USD cents
ADD COLUMN IF NOT EXISTS payout_frequency character varying(20) DEFAULT 'monthly', -- 'weekly', 'monthly', 'quarterly'
ADD COLUMN IF NOT EXISTS minimum_payout_threshold integer DEFAULT 1000; -- Minimum payout in USD cents ($10.00)

-- Add check constraint for payout frequency
ALTER TABLE public.verified_profiles 
ADD CONSTRAINT verified_profiles_payout_frequency_check 
CHECK (payout_frequency IN ('weekly', 'monthly', 'quarterly'));

-- Add check constraint for minimum payout threshold
ALTER TABLE public.verified_profiles 
ADD CONSTRAINT verified_profiles_minimum_payout_threshold_check 
CHECK (minimum_payout_threshold >= 0);

-- Create index for payout-related queries
CREATE INDEX IF NOT EXISTS idx_verified_profiles_payouts_enabled ON public.verified_profiles using btree (payouts_enabled) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_verified_profiles_next_payout_date ON public.verified_profiles using btree (next_payout_date) TABLESPACE pg_default;
