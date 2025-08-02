-- Fix user_follows table foreign key references
-- Change references from verified_profiles to profiles table

-- 1. First, check current foreign key constraints
SELECT 'Current foreign key constraints:' as info;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user_follows';

-- 2. Drop existing foreign key constraints
ALTER TABLE public.user_follows 
DROP CONSTRAINT IF EXISTS user_follows_follower_id_fkey;

ALTER TABLE public.user_follows 
DROP CONSTRAINT IF EXISTS user_follows_following_id_fkey;

-- 3. Add new foreign key constraints pointing to profiles table
ALTER TABLE public.user_follows 
ADD CONSTRAINT user_follows_follower_id_fkey 
FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_follows 
ADD CONSTRAINT user_follows_following_id_fkey 
FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Verify the new foreign key constraints
SELECT 'New foreign key constraints:' as info;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user_follows';

-- 5. Test the query that the app uses
SELECT 'Testing app query with profiles table:' as info;
SELECT 
  uf.follower_id,
  uf.following_id,
  uf.created_at,
  p.first_name,
  p.last_name,
  p.email,
  p.profile_photo_url
FROM user_follows uf
LEFT JOIN profiles p ON uf.follower_id = p.id
ORDER BY uf.created_at DESC
LIMIT 5; 