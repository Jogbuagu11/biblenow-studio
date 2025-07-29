-- Cleanup Thumbnail Bucket System
-- This script removes the thumbnail bucket and all related RLS policies
-- since we're now storing thumbnail URLs directly in the livestreams table

-- Drop all thumbnail-related RLS policies
DROP POLICY IF EXISTS "Allow authenticated uploads to thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete from their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update files in their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update thumbnails" ON storage.objects;

-- Drop any functions related to thumbnails
DROP FUNCTION IF EXISTS generate_thumbnail_path(UUID, TEXT);
DROP FUNCTION IF EXISTS user_owns_thumbnail(TEXT);

-- Note: The thumbnails bucket itself cannot be dropped via SQL
-- You'll need to delete it manually through the Supabase dashboard
-- or use the storage API with service role permissions

-- Verify cleanup
SELECT 
  'Thumbnail policies removed' as status,
  COUNT(*) as remaining_policies
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%thumbnail%';

-- Show remaining storage policies (should be none related to thumbnails)
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- Note: To completely remove the thumbnails bucket, run this in the Supabase dashboard:
-- 1. Go to Storage in the Supabase dashboard
-- 2. Find the 'thumbnails' bucket
-- 3. Delete it manually
-- 
-- Or use the storage API with service role:
-- DELETE FROM storage.buckets WHERE id = 'thumbnails'; 