-- Check user_invites table constraints and foreign keys
-- This will help us understand the exact table structure

-- 1. Check table constraints
SELECT 'Table constraints:' as info;
SELECT
  tc.constraint_name,
  tc.constraint_type,
  tc.table_name
FROM information_schema.table_constraints tc
WHERE tc.table_name = 'user_invites';

-- 2. Check foreign key constraints specifically
SELECT 'Foreign key constraints:' as info;
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'user_invites';

-- 3. Check check constraints
SELECT 'Check constraints:' as info;
SELECT
  tc.constraint_name,
  tc.table_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'user_invites'
AND tc.constraint_type = 'CHECK';

-- 4. Check indexes
SELECT 'Indexes on user_invites:' as info;
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_invites';

-- 5. Check triggers
SELECT 'Triggers on user_invites:' as info;
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_invites';

-- 6. Show the exact table definition
SELECT 'Table definition:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'user_invites'
ORDER BY ordinal_position; 