-- Cleanup and Fix Thumbnails RLS Policies
-- This removes all conflicting policies and creates clean ones

-- First, drop ALL existing policies for storage.objects
DROP POLICY IF EXISTS "Allow authenticated to delete their own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to update their own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload their own thumbnails" ON storage.objects;

-- Also drop any other policies that might conflict
DROP POLICY IF EXISTS "Allow authenticated uploads to thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own thumbnails" ON storage.objects;

-- Now create clean, simple policies

-- Policy 1: Allow authenticated users to upload to thumbnails bucket
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

-- Verify the cleanup worked
SELECT 
  'Cleanup Result' as check_type,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%thumbnails%';

-- Show the final policies
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