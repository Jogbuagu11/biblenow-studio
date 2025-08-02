-- Check the current schema of verified_profiles table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'verified_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if role column exists specifically
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'verified_profiles' 
AND table_schema = 'public'
AND column_name = 'role';

-- Show sample data to see what columns are actually available
SELECT * FROM verified_profiles LIMIT 1; 