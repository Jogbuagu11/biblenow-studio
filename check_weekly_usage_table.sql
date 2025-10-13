-- Check the structure of the livestream_weekly_usage table
-- to see what columns actually exist

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'livestream_weekly_usage'
ORDER BY ordinal_position;

-- Check if table exists at all
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'livestream_weekly_usage';

-- Get sample data to see what's actually in the table
SELECT 'Sample data from livestream_weekly_usage:' as info;
SELECT * FROM livestream_weekly_usage LIMIT 5;

-- Check if there are any records for the test user
SELECT 'Test user weekly usage:' as info;
SELECT * FROM livestream_weekly_usage 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid;
