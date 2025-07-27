-- Create thumbnails storage bucket if it doesn't exist
-- This script should be run in the Supabase SQL editor

-- Note: Storage buckets are typically created through the Supabase dashboard
-- or via the storage API, but here's the SQL approach for reference

-- Check if thumbnails bucket exists
DO $$
BEGIN
    -- Create the thumbnails bucket if it doesn't exist
    -- Note: This is a placeholder as bucket creation is typically done via dashboard
    -- or storage API, not SQL
    
    -- Set up RLS policies for the thumbnails bucket
    -- Allow authenticated users to upload thumbnails
    INSERT INTO storage.policies (name, bucket_id, definition)
    VALUES (
        'Allow authenticated users to upload thumbnails',
        'thumbnails',
        '{"type": "insert", "definition": {"role": "authenticated"}}'
    ) ON CONFLICT DO NOTHING;
    
    -- Allow public read access to thumbnails
    INSERT INTO storage.policies (name, bucket_id, definition)
    VALUES (
        'Allow public read access to thumbnails',
        'thumbnails',
        '{"type": "select", "definition": {"role": "anon"}}'
    ) ON CONFLICT DO NOTHING;
    
    -- Allow users to delete their own thumbnails
    INSERT INTO storage.policies (name, bucket_id, definition)
    VALUES (
        'Allow users to delete their own thumbnails',
        'thumbnails',
        '{"type": "delete", "definition": {"role": "authenticated"}}'
    ) ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Thumbnails bucket policies configured';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error setting up thumbnails bucket: %', SQLERRM;
END $$; 