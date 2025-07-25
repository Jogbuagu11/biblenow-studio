-- Simple search for category references
-- Run this in your Supabase SQL Editor

-- 1. Check if category column exists in any table
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND column_name = 'category';

-- 2. Check for any constraints on category
SELECT 
    tc.constraint_name,
    tc.table_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public' 
AND tc.constraint_name LIKE '%category%';

-- 3. Check for any indexes on category columns
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND indexdef LIKE '%category%';

-- 4. Check for any RLS policies
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public' 
AND policyname LIKE '%category%';

-- 5. List all tables to see their structure
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'livestreams'
ORDER BY ordinal_position; 