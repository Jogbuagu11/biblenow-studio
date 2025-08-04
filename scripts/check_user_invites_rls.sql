-- Check RLS policies on user_invites table
-- This will help us understand if RLS is blocking access

-- 1. Check if RLS is enabled
SELECT 'RLS status:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'user_invites';

-- 2. Check RLS policies
SELECT 'RLS policies:' as info;
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
WHERE tablename = 'user_invites';

-- 3. Check if the current user can access the table
-- This will help us understand the auth context
SELECT 'Current auth context:' as info;
SELECT 
  current_user,
  session_user,
  auth.uid() as auth_uid;

-- 4. Test a simple query to see if we can access the table at all
SELECT 'Test query - all invites:' as info;
SELECT COUNT(*) as total_invites FROM user_invites;

-- 5. Test query with specific user ID (replace with your actual user ID)
SELECT 'Test query - invites for specific user:' as info;
SELECT COUNT(*) as user_invites 
FROM user_invites 
WHERE inviter_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0';

-- 6. Check if there are any policies that might be too restrictive
SELECT 'Policy details:' as info;
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_invites'
AND (qual LIKE '%auth.uid%' OR with_check LIKE '%auth.uid%'); 