-- Test script to verify shield functionality
-- This will help us understand if the shield process is working correctly

-- 1. Check if user_shields table exists and has the right structure
SELECT 'user_shields table structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_shields'
ORDER BY ordinal_position;

-- 2. Check if there are any recent shield operations
SELECT 'Recent shield operations:' as info;
SELECT 
  id,
  user_id,
  shielded_user_id,
  created_at
FROM user_shields
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if the shielded user profiles exist
SELECT 'Shielded user profiles check:' as info;
SELECT 
  us.shielded_user_id,
  us.created_at,
  CASE 
    WHEN vp.id IS NOT NULL THEN 'Profile exists'
    ELSE 'Profile missing'
  END as profile_status,
  vp.first_name,
  vp.last_name,
  vp.email
FROM user_shields us
LEFT JOIN verified_profiles vp ON us.shielded_user_id = vp.id
ORDER BY us.created_at DESC;

-- 4. Test the shield edge function manually
-- This would be done through the API, but we can check if the function exists
SELECT 'Available functions:' as info;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%shield%';

-- 5. Check if there are any RLS policies that might be blocking access
SELECT 'RLS policies on user_shields:' as info;
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
WHERE tablename = 'user_shields'; 