-- Test script to verify invite functionality
-- This will help us understand if the invite system is working correctly

-- 1. Check if user_invites table exists and has the right structure
SELECT 'user_invites table structure:' as info;
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_invites'
ORDER BY ordinal_position;

-- 2. Check if there are any existing invites
SELECT 'Existing invites:' as info;
SELECT
  id,
  inviter_id,
  invitee_email,
  sent_at,
  accepted,
  accepted_at,
  message,
  status,
  resent_at
FROM user_invites
ORDER BY sent_at DESC;

-- 3. Check invite statistics
SELECT 'Invite statistics:' as info;
SELECT
  COUNT(*) as total_invites,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_invites,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invites,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_invites,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_invites,
  ROUND(
    (COUNT(CASE WHEN status = 'accepted' THEN 1 END)::decimal / COUNT(*)::decimal) * 100, 2
  ) as acceptance_rate_percent
FROM user_invites;

-- 4. Check invites by inviter (replace 'your-user-id' with actual user ID)
SELECT 'Invites by inviter:' as info;
SELECT
  inviter_id,
  COUNT(*) as total_invites,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_invites,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invites
FROM user_invites
GROUP BY inviter_id
ORDER BY total_invites DESC;

-- 5. Check recent invites (last 30 days)
SELECT 'Recent invites (last 30 days):' as info;
SELECT
  id,
  inviter_id,
  invitee_email,
  sent_at,
  status,
  message
FROM user_invites
WHERE sent_at >= NOW() - INTERVAL '30 days'
ORDER BY sent_at DESC;

-- 6. Check if there are any RLS policies that might be blocking access
SELECT 'RLS policies on user_invites:' as info;
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

-- 7. Test the invite triggers
SELECT 'Available functions:' as info;
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%invite%';

-- 8. Check if there are any foreign key constraints
SELECT 'Foreign key constraints:' as info;
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'user_invites'; 