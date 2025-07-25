-- Search for any database objects that reference 'category'
-- Run this in your Supabase SQL Editor to find all references to category

-- 1. Check if category column still exists in any table
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND column_name ILIKE '%category%';

-- 2. Search for any constraints that reference category
SELECT 
    tc.constraint_name,
    tc.table_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
AND (tc.constraint_name ILIKE '%category%' 
     OR cc.check_clause ILIKE '%category%');

-- 3. Search for any RLS policies that reference category
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
WHERE schemaname = 'public' 
AND (qual ILIKE '%category%' OR with_check ILIKE '%category%');

-- 4. Search for any stored procedures or functions in the database
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_definition ILIKE '%category%';

-- 5. Search for functions that contain 'category' (simplified)
SELECT 
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND pg_get_functiondef(p.oid) ILIKE '%category%';

-- 6. Search for triggers that might reference category (simplified)
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND pg_get_triggerdef(t.oid) ILIKE '%category%';

-- 7. Search for views that contain category (simplified)
SELECT 
    c.relname as view_name
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relkind = 'v'
AND pg_get_viewdef(c.oid) ILIKE '%category%'; 