-- Debug Upload Issue
-- Run this to check what's happening with the RLS policies

-- Check if thumbnails bucket exists
SELECT 
  'Bucket Status' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'thumbnails') 
    THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as status;

-- Check RLS status
SELECT 
  'RLS Status' as check_type,
  CASE 
    WHEN rowsecurity THEN 'ENABLED' 
    ELSE 'DISABLED' 
  END as status
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- List all policies for storage.objects
SELECT 
  'Policy Check' as check_type,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN 'HAS USING CLAUSE'
    ELSE 'NO USING CLAUSE'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'HAS WITH CHECK CLAUSE'
    ELSE 'NO WITH CHECK CLAUSE'
  END as with_check_clause
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- Check if there are any conflicting policies
SELECT 
  'Policy Conflicts' as check_type,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname NOT LIKE '%thumbnails%'
AND cmd IN ('INSERT', 'DELETE', 'UPDATE')
ORDER BY policyname;

-- Test the current user context
SELECT 
  'Current User Context' as check_type,
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- Check if the user is authenticated
SELECT 
  'Authentication Status' as check_type,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'AUTHENTICATED'
    ELSE 'NOT AUTHENTICATED'
  END as status;

-- Simulate the upload path structure
SELECT 
  'Path Structure Test' as check_type,
  'thumbnails/' || auth.uid()::text || '/test.jpg' as example_path,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'USER ID AVAILABLE'
    ELSE 'NO USER ID'
  END as user_status; 