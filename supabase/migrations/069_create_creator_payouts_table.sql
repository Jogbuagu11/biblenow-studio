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
