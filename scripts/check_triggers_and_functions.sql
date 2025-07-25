-- Check for triggers and functions that might be causing the category error
-- Run this in your Supabase SQL Editor

-- 1. List all triggers on the livestreams table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'livestreams'
AND trigger_schema = 'public';

-- 2. List all functions in the public schema
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 3. Check if there are any triggers that might be trying to access category
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'livestreams';

-- 4. Check for any RLS policies on livestreams table
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'livestreams'
AND schemaname = 'public';

-- 5. Check if there are any default values or constraints that might reference category
SELECT 
    column_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'livestreams'
AND column_default IS NOT NULL; 