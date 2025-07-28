-- Fix RLS Policies for Thumbnails Bucket
-- This version uses simpler, more permissive policies

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads to thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own thumbnails" ON storage.objects;

-- Policy 1: Allow authenticated users to upload to thumbnails bucket
-- More permissive - allows any authenticated user to upload to thumbnails bucket
CREATE POLICY "Allow authenticated uploads to thumbnails" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails'
);

-- Policy 2: Allow public read access to all thumbnails
CREATE POLICY "Allow public read access to thumbnails" ON storage.objects
FOR SELECT 
TO public
USING (
  bucket_id = 'thumbnails'
);

-- Policy 3: Allow authenticated users to delete from thumbnails bucket
-- More permissive - allows any authenticated user to delete from thumbnails bucket
CREATE POLICY "Allow users to delete thumbnails" ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'thumbnails'
);

-- Policy 4: Allow authenticated users to update files in thumbnails bucket
CREATE POLICY "Allow users to update thumbnails" ON storage.objects
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'thumbnails'
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