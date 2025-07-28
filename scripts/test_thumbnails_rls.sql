-- Test RLS Policies for Thumbnails Bucket
-- Run this to verify the setup is working

-- Check if bucket exists
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'thumbnails';

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- List all policies for storage.objects
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- Test policy: Check if authenticated users can upload to their own folder
-- This simulates what happens when a user uploads a file
SELECT 
  'Policy test: Authenticated upload to own folder' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'objects' 
      AND schemaname = 'storage'
      AND policyname = 'Allow authenticated uploads to thumbnails'
      AND cmd = 'INSERT'
      AND roles = '{authenticated}'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END as result;

-- Test policy: Check if public can read
SELECT 
  'Policy test: Public read access' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'objects' 
      AND schemaname = 'storage'
      AND policyname = 'Allow public read access to thumbnails'
      AND cmd = 'SELECT'
      AND roles = '{public}'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END as result;

-- Test policy: Check if users can delete their own files
SELECT 
  'Policy test: User delete own files' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'objects' 
      AND schemaname = 'storage'
      AND policyname = 'Allow users to delete their own thumbnails'
      AND cmd = 'DELETE'
      AND roles = '{authenticated}'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END as result;

-- Test policy: Check if users can update their own files
SELECT 
  'Policy test: User update own files' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'objects' 
      AND schemaname = 'storage'
      AND policyname = 'Allow users to update their own thumbnails'
      AND cmd = 'UPDATE'
      AND roles = '{authenticated}'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END as result;

-- Summary
SELECT 
  'RLS Setup Summary' as summary,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%thumbnails%'; 