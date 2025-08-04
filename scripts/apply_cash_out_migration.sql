-- Apply cash out requests table migration
-- This script creates the cash_out_requests table and related policies

-- Create cash_out_requests table
CREATE TABLE IF NOT EXISTS public.cash_out_requests (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  amount integer not null, -- Amount in Shekelz
  cash_amount integer not null, -- Amount in USD cents
  status character varying(20) not null default 'pending'::character varying,
  stripe_transfer_id character varying(255) null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  processed_at timestamp without time zone null,
  error_message text null,
  constraint cash_out_requests_pkey primary key (id),
  constraint cash_out_requests_user_id_fkey foreign KEY (user_id) references verified_profiles (id) on delete CASCADE,
  constraint cash_out_requests_status_check check (
    (
      (status)::text = any (
        array[
          ('pending'::character varying)::text,
          ('processing'::character varying)::text,
          ('completed'::character varying)::text,
          ('failed'::character varying)::text
        ]
      )
    )
  ),
  constraint cash_out_requests_amount_check check (amount > 0),
  constraint cash_out_requests_cash_amount_check check (cash_amount > 0)
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF not exists idx_cash_out_requests_user_id on public.cash_out_requests using btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF not exists idx_cash_out_requests_status on public.cash_out_requests using btree (status) TABLESPACE pg_default;
CREATE INDEX IF not exists idx_cash_out_requests_created_at on public.cash_out_requests using btree (created_at desc) TABLESPACE pg_default;
CREATE INDEX IF not exists idx_cash_out_requests_stripe_transfer_id on public.cash_out_requests using btree (stripe_transfer_id) TABLESPACE pg_default;

-- Add RLS policies
ALTER TABLE public.cash_out_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own cash out requests
CREATE POLICY "Users can view own cash out requests" ON public.cash_out_requests
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Policy: Users can only insert their own cash out requests
CREATE POLICY "Users can insert own cash out requests" ON public.cash_out_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Only system can update cash out requests (for status updates)
CREATE POLICY "System can update cash out requests" ON public.cash_out_requests
  FOR UPDATE USING (false); -- This will be bypassed by service role

-- Policy: Only system can delete cash out requests
CREATE POLICY "System can delete cash out requests" ON public.cash_out_requests
  FOR DELETE USING (false); -- This will be bypassed by service role

-- Verify the table was created successfully
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'cash_out_requests'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'cash_out_requests'; 