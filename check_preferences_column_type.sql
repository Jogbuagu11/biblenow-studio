-- Check the actual type of the preferences column in verified_profiles table

-- Check column types
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'verified_profiles'
AND column_name = 'preferences'
ORDER BY ordinal_position;

-- Check all columns in verified_profiles table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'verified_profiles'
ORDER BY ordinal_position;

-- Check sample data to see what's actually in the preferences column
SELECT 
    id,
    preferences,
    pg_typeof(preferences) as preferences_type
FROM verified_profiles 
LIMIT 5;
