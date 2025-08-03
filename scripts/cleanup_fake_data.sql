-- Comprehensive cleanup of fake/test data
-- This script removes fake profiles, follows, and shields

BEGIN;

-- 1. First, let's see what we have
SELECT '=== CURRENT DATA ===' as info;

SELECT 'Verified Profiles:' as info;
SELECT COUNT(*) as total_profiles FROM verified_profiles;

SELECT 'User Follows:' as info;
SELECT COUNT(*) as total_follows FROM user_follows;

SELECT 'User Shields:' as info;
SELECT COUNT(*) as total_shields FROM user_shields;

-- 2. Remove fake verified profiles
SELECT '=== REMOVING FAKE PROFILES ===' as info;

DELETE FROM verified_profiles 
WHERE email LIKE '%test%' 
   OR email LIKE '%fake%' 
   OR email LIKE '%example%'
   OR email LIKE '%@test.com'
   OR email LIKE '%@example.com'
   OR email LIKE '%@fake.com'
   OR first_name LIKE '%test%'
   OR first_name LIKE '%fake%'
   OR last_name LIKE '%test%'
   OR last_name LIKE '%fake%'
   OR created_at > NOW() - INTERVAL '24 hours';

-- 3. Remove orphaned follows (where profiles no longer exist)
SELECT '=== REMOVING ORPHANED FOLLOWS ===' as info;

DELETE FROM user_follows 
WHERE follower_id NOT IN (SELECT id FROM verified_profiles)
   OR following_id NOT IN (SELECT id FROM verified_profiles);

-- 4. Remove orphaned shields (where profiles no longer exist)
SELECT '=== REMOVING ORPHANED SHIELDS ===' as info;

DELETE FROM user_shields 
WHERE user_id NOT IN (SELECT id FROM verified_profiles)
   OR shielded_user_id NOT IN (SELECT id FROM verified_profiles);

-- 5. Show final results
SELECT '=== FINAL DATA ===' as info;

SELECT 'Verified Profiles:' as info;
SELECT COUNT(*) as total_profiles FROM verified_profiles;

SELECT 'User Follows:' as info;
SELECT COUNT(*) as total_follows FROM user_follows;

SELECT 'User Shields:' as info;
SELECT COUNT(*) as total_shields FROM user_shields;

-- 6. Show remaining profiles
SELECT 'Remaining verified profiles:' as info;
SELECT 
  id,
  email,
  first_name,
  last_name,
  ministry_name,
  created_at
FROM verified_profiles
ORDER BY created_at DESC;

COMMIT; 