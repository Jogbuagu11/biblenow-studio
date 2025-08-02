create table public.user_shields (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  shielded_user_id uuid not null,
  created_at timestamp with time zone null default now(),
  constraint user_shields_pkey primary key (id)
) TABLESPACE pg_default;

-- Add RLS policies
alter table public.user_shields enable row level security;

-- Policy to allow users to see their own shields
create policy "Users can view their own shields" on public.user_shields
  for select using (auth.uid() = user_id);

-- Policy to allow users to create shields
create policy "Users can create shields" on public.user_shields
  for insert with check (auth.uid() = user_id or auth.uid() is not null);

-- Policy to allow users to delete their own shields
create policy "Users can delete their own shields" on public.user_shields
  for delete using (auth.uid() = user_id);

-- Add indexes for better performance
create index idx_user_shields_user_id on public.user_shields(user_id);
create index idx_user_shields_shielded_user_id on public.user_shields(shielded_user_id);
create index idx_user_shields_created_at on public.user_shields(created_at); 