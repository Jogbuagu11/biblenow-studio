-- Drop the existing policies that are causing issues
drop policy if exists "Allow user to delete their blocks" on public.user_shields;
drop policy if exists "Allow user to insert block" on public.user_shields;
drop policy if exists "Allow user to view their blocks" on public.user_shields;

-- Create new, simpler policies
create policy "Users can view their own shields" on public.user_shields
  for select using (auth.uid() = user_id);

create policy "Users can create shields" on public.user_shields
  for insert with check (auth.uid() is not null);

create policy "Users can delete their own shields" on public.user_shields
  for delete using (auth.uid() = user_id); 