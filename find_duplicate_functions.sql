-- Find all functions with the name 'get_weekly_streaming_usage'
-- This will show you all the duplicate functions causing the error

-- Method 1: Using information_schema.routines
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition,
    external_language,
    is_deterministic,
    security_type,
    created
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_weekly_streaming_usage'
ORDER BY created DESC;

-- Method 2: Using pg_proc (more detailed)
SELECT 
    p.proname as function_name,
    p.oid as function_oid,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    p.prosrc as source_code,
    p.prolang as language_oid,
    l.lanname as language_name,
    p.prosecdef as security_definer,
    p.proisstrict as is_strict,
    p.provolatile as volatility,
    p.procost as estimated_cost,
    p.prorows as estimated_rows
FROM pg_proc p
JOIN pg_language l ON p.prolang = l.oid
WHERE p.proname = 'get_weekly_streaming_usage'
ORDER BY p.oid;

-- Method 3: Find all functions with similar names (in case there are variations)
SELECT 
    routine_name,
    routine_type,
    data_type,
    created
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%streaming%'
ORDER BY routine_name, created DESC;

-- Method 4: Get the exact DROP statements needed
SELECT 
    'DROP FUNCTION IF EXISTS ' || p.proname || '(' || 
    pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_statement
FROM pg_proc p
WHERE p.proname = 'get_weekly_streaming_usage'
ORDER BY p.oid;
