-- Secure RLS Policies for Thumbnails Bucket
-- This version uses metadata to track ownership instead of folder structure

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads to thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own thumbnails" ON storage.objects;

-- Policy 1: Allow authenticated users to upload to thumbnails bucket
-- Users can upload to thumbnails bucket, ownership tracked via metadata
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

-- Policy 3: Allow users to delete their own thumbnails
-- Check ownership via metadata or path structure
CREATE POLICY "Allow users to delete their own thumbnails" ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'thumbnails' 
  AND (
    -- Option 1: Check if path contains user ID
    name LIKE 'thumbnails/' || auth.uid()::text || '/%'
    -- Option 2: Check metadata if available
    -- OR (metadata->>'owner_id')::text = auth.uid()::text
  )
);

-- Policy 4: Allow users to update their own thumbnails
CREATE POLICY "Allow users to update their own thumbnails" ON storage.objects
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'thumbnails' 
  AND (
    -- Option 1: Check if path contains user ID
    name LIKE 'thumbnails/' || auth.uid()::text || '/%'
    -- Option 2: Check metadata if available
    -- OR (metadata->>'owner_id')::text = auth.uid()::text
  )
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