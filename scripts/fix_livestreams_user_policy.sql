-- Fix Livestreams RLS Policies for User Creation
-- Run this in your Supabase SQL Editor

-- 1. First, drop all existing policies
DROP POLICY IF EXISTS "Public read access" ON public.livestreams;
DROP POLICY IF EXISTS "Users can create own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can update own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can delete own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Admin full access" ON public.livestreams;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.livestreams;

-- 2. Create new policies

-- Public read access (anyone can view livestreams)
CREATE POLICY "Public read access" ON public.livestreams
    FOR SELECT
    USING (true);

-- Users can create their own livestreams
CREATE POLICY "Users can create own livestreams" ON public.livestreams
    FOR INSERT
    WITH CHECK (
        auth.uid()::text = streamer_id::text
    );

-- Users can update their own livestreams
CREATE POLICY "Users can update own livestreams" ON public.livestreams
    FOR UPDATE
    USING (auth.uid()::text = streamer_id::text)
    WITH CHECK (auth.uid()::text = streamer_id::text);

-- Users can delete their own livestreams
CREATE POLICY "Users can delete own livestreams" ON public.livestreams
    FOR DELETE
    USING (auth.uid()::text = streamer_id::text);

-- 3. Verify policies were created
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'livestreams'
AND schemaname = 'public'
ORDER BY policyname;

-- 4. Test the policy (optional - run this to test)
DO $$
DECLARE
    test_user_id TEXT;
    result RECORD;
BEGIN
    -- Get current user ID
    test_user_id := auth.uid()::text;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user - cannot test insert';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing insert with user ID: %', test_user_id;
    
    BEGIN
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
            'Test Stream',
            'Test Description',
            test_user_id,
            false,
            'active',
            'Test',
            'video',
            0,
            NOW()
        ) RETURNING * INTO result;
        
        RAISE NOTICE 'SUCCESS: Inserted stream with ID: %', result.id;
        
        -- Clean up
        DELETE FROM public.livestreams WHERE id = result.id;
        RAISE NOTICE 'Cleaned up test stream';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'FAILED: %', SQLERRM;
    END;
END $$; 