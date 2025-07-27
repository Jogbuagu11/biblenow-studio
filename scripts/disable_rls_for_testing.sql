-- Disable RLS for testing livestream creation
-- Run this in your Supabase SQL Editor

-- Option 1: Disable RLS completely (simplest for testing)
ALTER TABLE public.livestreams DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS enabled but make it very permissive
-- First drop all existing policies
-- DROP POLICY IF EXISTS "Public read access" ON public.livestreams;
-- DROP POLICY IF EXISTS "Users can create own livestreams" ON public.livestreams;
-- DROP POLICY IF EXISTS "Users can update own livestreams" ON public.livestreams;
-- DROP POLICY IF EXISTS "Users can delete own livestreams" ON public.livestreams;
-- DROP POLICY IF EXISTS "Admin full access" ON public.livestreams;
-- DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.livestreams;

-- Then create a single permissive policy
-- CREATE POLICY "Allow all operations" ON public.livestreams
--     FOR ALL
--     USING (true)
--     WITH CHECK (true);

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'livestreams';

-- To re-enable RLS later, run:
-- ALTER TABLE public.livestreams ENABLE ROW LEVEL SECURITY; 