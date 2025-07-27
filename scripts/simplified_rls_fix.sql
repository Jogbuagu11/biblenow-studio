-- Simplified RLS Fix for Livestreams
-- Run this in your Supabase SQL Editor

-- 1. Drop ALL existing policies
DROP POLICY IF EXISTS "Public can view livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Streamers can delete own streams" ON public.livestreams;
DROP POLICY IF EXISTS "Streamers can update own streams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can delete their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can insert their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can read their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can update their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can view all streams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can view own streams" ON public.livestreams;
DROP POLICY IF EXISTS "Verified users can create streams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can create own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Admins have full access to livestreams" ON public.livestreams;

-- 2. Create a single, simple policy that allows everything for authenticated users
CREATE POLICY "Allow all for authenticated users" 
ON public.livestreams
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Also allow public read access
CREATE POLICY "Public read access" 
ON public.livestreams
FOR SELECT 
USING (true);

-- 4. Verify the policies
SELECT 
    'Simplified Policies' as step,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'livestreams'
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 5. Test the simplified policy
DO $$
DECLARE
    test_user_id UUID;
    insert_result RECORD;
BEGIN
    test_user_id := auth.uid();
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user - this is expected to fail';
    ELSE
        RAISE NOTICE 'Testing with authenticated user: %', test_user_id;
        
        INSERT INTO public.livestreams (
            title,
            description,
            streamer_id,
            is_live,
            status,
            platform,
            stream_type,
            viewer_count,
            updated_at
        ) VALUES (
            'Test Stream - Simplified Policy',
            'Testing simplified RLS policy',
            test_user_id,
            false,
            'active',
            'Test',
            'video',
            0,
            NOW()
        ) RETURNING * INTO insert_result;
        
        RAISE NOTICE 'SUCCESS: Inserted livestream with ID: %', insert_result.id;
        
        -- Clean up
        DELETE FROM public.livestreams WHERE id = insert_result.id;
        RAISE NOTICE 'Cleaned up test livestream';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: %', SQLERRM;
END $$; 