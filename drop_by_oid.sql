-- Drop functions by OID to ensure we get all duplicates
-- This is more reliable than dropping by name and signature

-- First, let's see what we're dealing with
SELECT 
    p.oid,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
WHERE p.proname IN (
    'get_user_streaming_limit',
    'get_weekly_streaming_usage', 
    'add_streaming_minutes',
    'notify_streaming_limit_status'
)
ORDER BY p.proname, p.oid;

-- Now drop by OID (replace the OIDs with the actual ones from the query above)
-- You'll need to run the query above first to get the OIDs, then replace them here

-- Example format (replace with actual OIDs):
-- DROP FUNCTION IF EXISTS pg_catalog.pg_proc(oid) CASCADE;

-- Alternative approach: Drop the entire schema and recreate it
-- WARNING: This will drop ALL functions in the public schema
-- Only use this if you're sure you want to start completely fresh

-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;
