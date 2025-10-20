-- Migration strategy for existing cash-out data to new donation model
-- This script provides a plan for migrating existing data

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

-- Step 8: Create a view for backward compatibility (optional)
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

-- Step 9: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_migration_mapping_original ON public.migration_mapping(original_table, original_id);
CREATE INDEX IF NOT EXISTS idx_migration_mapping_new ON public.migration_mapping(new_table, new_id);

-- Step 10: Create a function to check migration status
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
