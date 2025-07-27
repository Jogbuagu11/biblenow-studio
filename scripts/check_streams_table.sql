-- Check if there's a streams table and what it contains
-- Run this in your Supabase SQL Editor

-- 1. Check if streams table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%stream%';

-- 2. If streams table exists, show its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'streams'
ORDER BY ordinal_position;

-- 3. If streams table exists, show row count
SELECT 
    'streams' as table_name,
    COUNT(*) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'streams'
UNION ALL
SELECT 
    'livestreams' as table_name,
    COUNT(*) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'livestreams';

-- 4. Check for any triggers on streams table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'streams';

-- 5. Check for any functions that reference streams table
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_definition ILIKE '%streams%'
AND routine_definition NOT ILIKE '%livestreams%'; 