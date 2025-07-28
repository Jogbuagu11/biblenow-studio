-- RLS Policies for Thumbnails Bucket
-- This script sets up proper Row Level Security for the thumbnails storage bucket

-- First, ensure RLS is enabled on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to upload thumbnails
-- Users can insert (upload) files to the thumbnails bucket
CREATE POLICY "Allow authenticated users to upload thumbnails" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails' 
  AND (storage.foldername(name))[1] = 'thumbnails'
);

-- Policy 2: Allow public read access to thumbnails
-- Anyone can view/download thumbnail images
CREATE POLICY "Allow public read access to thumbnails" ON storage.objects
FOR SELECT 
TO public
USING (
  bucket_id = 'thumbnails'
);

-- Policy 3: Allow users to delete their own thumbnails
-- Users can delete files they uploaded (based on auth.uid())
CREATE POLICY "Allow users to delete their own thumbnails" ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Allow users to update their own thumbnails
-- Users can update metadata of files they uploaded
CREATE POLICY "Allow users to update their own thumbnails" ON storage.objects
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'thumbnails'
);

-- Alternative approach: If you want to store user ID in the file path
-- This creates a more structured approach where files are stored as: thumbnails/{user_id}/{filename}

-- Policy 5: Allow users to upload to their own folder
CREATE POLICY "Allow users to upload to their own folder" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails' 
  AND (storage.foldername(name))[1] = 'thumbnails'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 6: Allow users to delete from their own folder
CREATE POLICY "Allow users to delete from their own folder" ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'thumbnails' 
  AND (storage.foldername(name))[1] = 'thumbnails'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 7: Allow users to update files in their own folder
CREATE POLICY "Allow users to update files in their own folder" ON storage.objects
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

-- Create a function to help with file path generation
CREATE OR REPLACE FUNCTION generate_thumbnail_path(user_id UUID, filename TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'thumbnails/' || user_id::text || '/' || filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user owns the thumbnail
CREATE OR REPLACE FUNCTION user_owns_thumbnail(file_path TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the file path contains the user's ID
  RETURN (
    SELECT auth.uid()::text = (storage.foldername(file_path))[2]
    WHERE (storage.foldername(file_path))[1] = 'thumbnails'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- Verify the policies were created
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
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname; 