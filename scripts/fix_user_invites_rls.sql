-- Fix RLS policies on user_invites table
-- This will ensure users can access their own invites

-- 1. First, let's see what policies currently exist
SELECT 'Current RLS policies:' as info;
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_invites';

-- 2. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own invites" ON public.user_invites;
DROP POLICY IF EXISTS "Users can create invites" ON public.user_invites;
DROP POLICY IF EXISTS "Users can update their own invites" ON public.user_invites;
DROP POLICY IF EXISTS "Users can delete their own invites" ON public.user_invites;

-- 3. Create proper RLS policies
-- Users can view their own invites
CREATE POLICY "Users can view their own invites" ON public.user_invites
  FOR SELECT USING (auth.uid()::text = inviter_id::text);

-- Users can create invites
CREATE POLICY "Users can create invites" ON public.user_invites
  FOR INSERT WITH CHECK (auth.uid()::text = inviter_id::text);

-- Users can update their own invites
CREATE POLICY "Users can update their own invites" ON public.user_invites
  FOR UPDATE USING (auth.uid()::text = inviter_id::text);

-- Users can delete their own invites
CREATE POLICY "Users can delete their own invites" ON public.user_invites
  FOR DELETE USING (auth.uid()::text = inviter_id::text);

-- 4. Verify the policies were created
SELECT 'New RLS policies:' as info;
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_invites';

-- 5. Test if the policies work
SELECT 'Testing RLS access:' as info;
-- This should work if the user is authenticated
SELECT COUNT(*) as user_invites 
FROM user_invites 
WHERE inviter_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'; 