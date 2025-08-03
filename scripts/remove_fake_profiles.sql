-- Remove fake/test verified profiles
-- This script will help clean up any test data

-- First, let's see what profiles exist
SELECT 'Current verified profiles:' as info;
SELECT 
  id,
  email,
  first_name,
  last_name,
  ministry_name,
  created_at
FROM verified_profiles
ORDER BY created_at DESC;

-- Remove profiles with test/fake email patterns
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
   OR last_name LIKE '%fake%';

-- Remove profiles created in the last 24 hours (likely test data)
DELETE FROM verified_profiles 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Show remaining profiles
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