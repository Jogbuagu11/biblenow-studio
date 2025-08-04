-- Check existing invite data
-- This will help us see what invite history already exists

-- 1. Check total count
SELECT 'Total invites in database:' as info;
SELECT COUNT(*) as total_invites FROM user_invites;

-- 2. Show recent invites (last 10)
SELECT 'Recent invites:' as info;
SELECT
  id,
  inviter_id,
  invitee_email,
  sent_at,
  status,
  message,
  accepted,
  accepted_at
FROM user_invites
ORDER BY sent_at DESC
LIMIT 10;

-- 3. Check invites by status
SELECT 'Invites by status:' as info;
SELECT
  status,
  COUNT(*) as count
FROM user_invites
GROUP BY status
ORDER BY count DESC;

-- 4. Check if there are any invites for a specific user
-- Replace 'your-user-id' with your actual user ID
SELECT 'Sample inviter IDs:' as info;
SELECT DISTINCT inviter_id
FROM user_invites
LIMIT 5;

-- 5. Check table structure to make sure we're querying correctly
SELECT 'Table structure:' as info;
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_invites'
ORDER BY ordinal_position; 