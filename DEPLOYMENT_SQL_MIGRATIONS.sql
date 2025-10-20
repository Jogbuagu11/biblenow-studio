-- =====================================================
-- DEPLOYMENT SQL MIGRATIONS FOR CREATOR PAYOUTS SYSTEM
-- =====================================================
-- Run these SQL files in order to set up the new creator payouts system

-- =====================================================
-- 1. CREATE CREATOR PAYOUTS TABLE
-- =====================================================
-- File: 069_create_creator_payouts_table.sql

-- Create creator_payouts table for tracking bonus payments to creators
CREATE TABLE IF NOT EXISTS public.creator_payouts (
  id uuid not null default extensions.uuid_generate_v4(),
  creator_id uuid not null,
  period_start date not null,
  period_end date not null,
  total_shekelz integer not null,
  total_usd_gross integer not null, -- Total USD gross (cents)
  total_usd_net integer not null, -- Total USD net after platform fees (cents)
  bonus_percentage decimal(5,2) not null default 80.00, -- Bonus percentage (80% default)
  bonus_amount_usd integer not null, -- Calculated bonus amount (USD cents)
  stripe_transfer_id character varying(255) null,
  status character varying(20) not null default 'pending',
  processed_at timestamp without time zone null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  error_message text null,
  metadata jsonb null default '{}',
  constraint creator_payouts_pkey primary key (id),
  constraint creator_payouts_creator_id_fkey foreign key (creator_id) references verified_profiles (id) on delete cascade,
  constraint creator_payouts_status_check check (
    (status)::text = any (
      array[
        ('pending'::character varying)::text,
        ('processing'::character varying)::text,
        ('completed'::character varying)::text,
        ('failed'::character varying)::text,
        ('cancelled'::character varying)::text
      ]
    )
  ),
  constraint creator_payouts_period_check check (period_start <= period_end),
  constraint creator_payouts_amounts_check check (
    total_shekelz > 0 AND 
    total_usd_gross > 0 AND 
    total_usd_net > 0 AND 
    bonus_amount_usd >= 0
  ),
  constraint creator_payouts_bonus_percentage_check check (bonus_percentage >= 0 AND bonus_percentage <= 100)
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator_id ON public.creator_payouts using btree (creator_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_creator_payouts_period ON public.creator_payouts using btree (period_start, period_end) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_creator_payouts_status ON public.creator_payouts using btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_creator_payouts_created_at ON public.creator_payouts using btree (created_at desc) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_creator_payouts_stripe_transfer_id ON public.creator_payouts using btree (stripe_transfer_id) TABLESPACE pg_default;

-- Add RLS policies
ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;

-- Policy: Creators can view their own payouts
CREATE POLICY "Creators can view own payouts" ON public.creator_payouts
  FOR SELECT USING (auth.uid() = creator_id);

-- Policy: Service role can manage all payouts
CREATE POLICY "Service role can manage payouts" ON public.creator_payouts
  FOR ALL USING (true);

-- =====================================================
-- 2. ADD PAYOUT FIELDS TO VERIFIED_PROFILES
-- =====================================================
-- File: 070_add_payout_fields_to_verified_profiles.sql

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

-- =====================================================
-- 3. MIGRATE EXISTING CASH-OUT DATA (OPTIONAL)
-- =====================================================
-- File: 071_migrate_cash_out_to_donations.sql
-- NOTE: This is optional and only needed if you have existing cash-out data to migrate

-- Step 1: Create a backup of existing cash_out_requests
CREATE TABLE IF NOT EXISTS public.cash_out_requests_backup AS 
SELECT * FROM public.cash_out_requests;

-- Step 2: Create a mapping table to track migration
CREATE TABLE IF NOT EXISTS public.migration_mapping (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  original_table varchar(50) NOT NULL,
  original_id uuid NOT NULL,
  new_table varchar(50) NOT NULL,
  new_id uuid NOT NULL,
  migration_date timestamp DEFAULT NOW(),
  notes text
);

-- Step 3: Note: Cash-out requests don't need to be migrated to shekel_gifts
-- because shekel_gifts already contains the original Shekelz transactions.
-- Cash-outs were just a way to convert existing Shekelz to cash.
-- The new system will calculate bonuses directly from shekel_gifts data.

-- Step 4: Update creator payout totals based on completed cash-outs
UPDATE public.verified_profiles 
SET 
  total_payouts_usd = COALESCE(total_payouts_usd, 0) + COALESCE(
    (SELECT SUM(cor.cash_amount) 
     FROM public.cash_out_requests cor 
     WHERE cor.user_id = verified_profiles.id 
     AND cor.status = 'completed'), 0
  ),
  last_payout_date = (
    SELECT MAX(cor.processed_at)
    FROM public.cash_out_requests cor
    WHERE cor.user_id = verified_profiles.id
    AND cor.status = 'completed'
    AND cor.processed_at IS NOT NULL
  )
WHERE id IN (
  SELECT DISTINCT user_id 
  FROM public.cash_out_requests 
  WHERE status = 'completed'
);

-- Step 5: Create creator_payouts records for completed cash-outs
INSERT INTO public.creator_payouts (
  creator_id,
  period_start,
  period_end,
  total_shekelz,
  total_usd_gross,
  total_usd_net,
  bonus_percentage,
  bonus_amount_usd,
  stripe_transfer_id,
  status,
  processed_at,
  metadata
)
SELECT 
  cor.user_id as creator_id,
  DATE_TRUNC('month', cor.created_at)::date as period_start,
  (DATE_TRUNC('month', cor.created_at) + INTERVAL '1 month' - INTERVAL '1 day')::date as period_end,
  cor.amount as total_shekelz,
  cor.cash_amount as total_usd_gross,
  cor.cash_amount as total_usd_net,
  100.00 as bonus_percentage, -- Cash-outs were 100% of value
  cor.cash_amount as bonus_amount_usd,
  cor.stripe_transfer_id,
  CASE 
    WHEN cor.status = 'completed' THEN 'completed'
    WHEN cor.status = 'failed' THEN 'failed'
    ELSE 'pending'
  END as status,
  cor.processed_at,
  jsonb_build_object(
    'original_cash_out_id', cor.id,
    'migration_note', 'Migrated from cash_out_requests table'
  ) as metadata
FROM public.cash_out_requests cor
WHERE cor.status IN ('completed', 'failed', 'pending');

-- Step 6: Add comment explaining the migration
COMMENT ON TABLE public.cash_out_requests IS 'DEPRECATED: This table is no longer used. Data has been migrated to creator_payouts table. New system calculates bonuses from shekel_gifts table.';

-- Step 7: Create a view for backward compatibility (optional)
CREATE OR REPLACE VIEW public.cash_out_requests_legacy AS
SELECT 
  cor.id,
  cor.user_id,
  cor.amount,
  cor.cash_amount,
  cor.status,
  cor.stripe_transfer_id,
  cor.created_at,
  cor.processed_at,
  cor.error_message,
  'MIGRATED' as migration_status
FROM public.cash_out_requests cor;

-- Step 8: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_migration_mapping_original ON public.migration_mapping(original_table, original_id);
CREATE INDEX IF NOT EXISTS idx_migration_mapping_new ON public.migration_mapping(new_table, new_id);

-- Step 9: Create a function to check migration status
CREATE OR REPLACE FUNCTION check_migration_status()
RETURNS TABLE (
  table_name text,
  original_count bigint,
  migrated_count bigint,
  migration_percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'cash_out_requests'::text as table_name,
    (SELECT COUNT(*) FROM public.cash_out_requests) as original_count,
    (SELECT COUNT(*) FROM public.migration_mapping WHERE original_table = 'cash_out_requests') as migrated_count,
    CASE 
      WHEN (SELECT COUNT(*) FROM public.cash_out_requests) > 0 THEN
        ROUND(
          (SELECT COUNT(*) FROM public.migration_mapping WHERE original_table = 'cash_out_requests')::numeric / 
          (SELECT COUNT(*) FROM public.cash_out_requests)::numeric * 100, 2
        )
      ELSE 0
    END as migration_percentage;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created successfully
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('creator_payouts', 'migration_mapping');

-- Check if new columns were added to verified_profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'verified_profiles' 
AND column_name IN ('payouts_enabled', 'last_payout_date', 'next_payout_date', 'total_payouts_usd', 'payout_frequency', 'minimum_payout_threshold');

-- Check migration status (if migration was run)
SELECT * FROM check_migration_status();
