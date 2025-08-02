-- Drop existing policies
drop policy if exists "Users can view their own shields" on public.user_shields;
drop policy if exists "Users can create shields" on public.user_shields;
drop policy if exists "Users can delete their own shields" on public.user_shields;

-- Create more permissive policies for testing
create policy "Users can view their own shields" on public.user_shields
  for select using (auth.uid() = user_id);

-- Allow authenticated users to create shields
create policy "Users can create shields" on public.user_shields
  for insert with check (auth.uid() is not null);

-- Allow users to delete their own shields
create policy "Users can delete their own shields" on public.user_shields
  for delete using (auth.uid() = user_id); 