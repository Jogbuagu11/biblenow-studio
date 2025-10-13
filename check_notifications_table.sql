-- Check the structure of the studio_notifications table
-- to see what columns actually exist

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'studio_notifications'
ORDER BY ordinal_position;

-- Check if table exists at all
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'studio_notifications';

-- Get sample data to see what's actually in the table
SELECT * FROM studio_notifications LIMIT 5;
