-- Simple RLS Policies for Thumbnails Bucket
-- This script sets up Row Level Security for user-specific thumbnail folders

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads to thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own thumbnails" ON storage.objects;

-- Policy 1: Allow authenticated users to upload to their own folder
-- Users can only upload to: thumbnails/{user_id}/
CREATE POLICY "Allow authenticated uploads to thumbnails" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails' 
  AND (storage.foldername(name))[1] = 'thumbnails'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 2: Allow public read access to all thumbnails
-- Anyone can view/download thumbnail images
CREATE POLICY "Allow public read access to thumbnails" ON storage.objects
FOR SELECT 
TO public
USING (
  bucket_id = 'thumbnails'
);

-- Policy 3: Allow users to delete from their own folder
-- Users can only delete from: thumbnails/{user_id}/
CREATE POLICY "Allow users to delete their own thumbnails" ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'thumbnails' 
  AND (storage.foldername(name))[1] = 'thumbnails'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 4: Allow users to update files in their own folder
-- Users can only update files in: thumbnails/{user_id}/
CREATE POLICY "Allow users to update their own thumbnails" ON storage.objects
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'thumbnails' 
  AND (storage.foldername(name))[1] = 'thumbnails'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'thumbnails'
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- Verify the policies were created
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%thumbnails%'
ORDER BY policyname; 