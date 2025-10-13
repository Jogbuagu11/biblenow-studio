-- Check the actual structure of the livestream_weekly_usage table
-- to see what columns exist

-- Method 1: Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'livestream_weekly_usage'
ORDER BY ordinal_position;

-- Method 2: Check if table exists at all
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'livestream_weekly_usage';

-- Method 3: Get sample data to see what's actually in the table
SELECT * FROM livestream_weekly_usage LIMIT 5;

-- Method 4: Check all tables with 'streaming' or 'usage' in the name
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%streaming%' OR table_name LIKE '%usage%')
ORDER BY table_name;
