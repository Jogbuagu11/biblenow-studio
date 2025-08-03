-- Create shekel_gifts table
CREATE TABLE IF NOT EXISTS public.shekel_gifts (
  id uuid not null default extensions.uuid_generate_v4 (),
  sender_id uuid not null,
  recipient_id uuid not null,
  amount integer not null,
  message text null,
  is_anonymous boolean null default false,
  gift_type character varying(20) null default 'donation'::character varying,
  context character varying(50) null,
  context_id uuid null,
  status character varying(20) null default 'completed'::character varying,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  tax_amount integer null default 0,
  total_amount integer not null default 0,
  metadata text null,
  constraint shekel_gifts_pkey primary key (id),
  constraint shekel_gifts_recipient_id_fkey foreign KEY (recipient_id) references verified_profiles (id) on delete CASCADE,
  constraint shekel_gifts_sender_id_fkey foreign KEY (sender_id) references verified_profiles (id) on delete CASCADE,
  constraint shekel_gifts_gift_type_check check (
    (
      (gift_type)::text = any (
        array[
          ('donation'::character varying)::text,
          ('tip'::character varying)::text,
          ('gift'::character varying)::text
        ]
      )
    )
  ),
  constraint shekel_gifts_message_check check ((length(message) <= 200)),
  constraint shekel_gifts_status_check check (
    (
      (status)::text = any (
        array[
          ('pending'::character varying)::text,
          ('completed'::character varying)::text,
          ('failed'::character varying)::text,
          ('refunded'::character varying)::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF not exists idx_shekel_gifts_context on public.shekel_gifts using btree (context, context_id) TABLESPACE pg_default;
CREATE INDEX IF not exists idx_shekel_gifts_created_at on public.shekel_gifts using btree (created_at desc) TABLESPACE pg_default;
CREATE INDEX IF not exists idx_shekel_gifts_recipient_id on public.shekel_gifts using btree (recipient_id) TABLESPACE pg_default;
CREATE INDEX IF not exists idx_shekel_gifts_sender_id on public.shekel_gifts using btree (sender_id) TABLESPACE pg_default;

-- Create trigger for updated_at
CREATE TRIGGER update_shekel_gifts_updated_at BEFORE
update on shekel_gifts for EACH row
execute FUNCTION update_updated_at_column();

-- Create trigger for shekel gift activity (placeholder function)
CREATE OR REPLACE FUNCTION handle_shekel_gift_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be used to handle additional logic when gifts are created
  -- For now, it just returns the new record
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shekel_gift_activity_trigger
after INSERT on shekel_gifts for EACH row
execute FUNCTION handle_shekel_gift_activity();

-- Enable RLS
ALTER TABLE public.shekel_gifts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own gifts" ON public.shekel_gifts
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

CREATE POLICY "Users can insert gifts" ON public.shekel_gifts
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own gifts" ON public.shekel_gifts
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = recipient_id); 