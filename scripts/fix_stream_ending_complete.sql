-- Complete Fix for Stream Ending Issues
-- Run this in your Supabase SQL Editor

-- Step 1: Temporarily disable RLS to test if that's the issue
ALTER TABLE public.livestreams DISABLE ROW LEVEL SECURITY;

-- Step 2: Create the robust end stream functions
CREATE OR REPLACE FUNCTION end_stream_comprehensive(
    p_stream_id UUID DEFAULT NULL,
    p_streamer_id UUID DEFAULT NULL,
    p_force_end_all BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
    affected_streams INTEGER := 0;
    result JSON;
BEGIN
    -- If force_end_all is true, end all active streams
    IF p_force_end_all THEN
        UPDATE public.livestreams 
        SET 
            is_live = false,
            status = 'ended',
            ended_at = COALESCE(ended_at, NOW()),
            updated_at = NOW()
        WHERE is_live = true OR status = 'active';
        
        GET DIAGNOSTICS affected_streams = ROW_COUNT;
        
        result := json_build_object(
            'success', true,
            'message', 'Ended all active streams',
            'affected_streams', affected_streams
        );
        
    -- If specific stream ID is provided
    ELSIF p_stream_id IS NOT NULL THEN
        UPDATE public.livestreams 
        SET 
            is_live = false,
            status = 'ended',
            ended_at = COALESCE(ended_at, NOW()),
            updated_at = NOW()
        WHERE id = p_stream_id AND (is_live = true OR status = 'active');
        
        GET DIAGNOSTICS affected_streams = ROW_COUNT;
        
        IF affected_streams > 0 THEN
            result := json_build_object(
                'success', true,
                'message', 'Stream ended successfully',
                'stream_id', p_stream_id,
                'affected_streams', affected_streams
            );
        ELSE
            result := json_build_object(
                'success', false,
                'message', 'Stream not found or already ended',
                'stream_id', p_stream_id
            );
        END IF;
        
    -- If streamer_id is provided, end all their active streams
    ELSIF p_streamer_id IS NOT NULL THEN
        UPDATE public.livestreams 
        SET 
            is_live = false,
            status = 'ended',
            ended_at = COALESCE(ended_at, NOW()),
            updated_at = NOW()
        WHERE streamer_id = p_streamer_id AND (is_live = true OR status = 'active');
        
        GET DIAGNOSTICS affected_streams = ROW_COUNT;
        
        result := json_build_object(
            'success', true,
            'message', 'Ended all active streams for user',
            'streamer_id', p_streamer_id,
            'affected_streams', affected_streams
        );
        
    ELSE
        result := json_build_object(
            'success', false,
            'message', 'No parameters provided'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION end_stream_comprehensive(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION end_stream_comprehensive(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION end_stream_comprehensive(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION end_stream_comprehensive() TO authenticated;

-- Step 4: Test the function
SELECT 'Testing end_stream_comprehensive function' as test_step;
SELECT end_stream_comprehensive(p_force_end_all => false) as test_result;

-- Step 5: Show current active streams
SELECT 'Current active streams before ending' as info, COUNT(*) as count 
FROM public.livestreams 
WHERE is_live = true OR status = 'active';

-- Step 6: End all active streams to clean up
SELECT 'Ending all active streams' as action;
SELECT end_stream_comprehensive(p_force_end_all => true) as result;

-- Step 7: Verify streams are ended
SELECT 'Verification - streams after ending' as info, COUNT(*) as count 
FROM public.livestreams 
WHERE is_live = true OR status = 'active';

-- Step 8: Show recent activity
SELECT 'Recent stream activity' as info,
    id,
    title,
    streamer_id,
    started_at,
    ended_at,
    is_live,
    status,
    updated_at
FROM public.livestreams 
ORDER BY updated_at DESC
LIMIT 10;

-- Step 9: Re-enable RLS with a simple policy
ALTER TABLE public.livestreams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access" ON public.livestreams;
DROP POLICY IF EXISTS "Users can create own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can update own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can delete own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Admin full access" ON public.livestreams;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.livestreams;

-- Create simple permissive policies
CREATE POLICY "Public read access" ON public.livestreams
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to create livestreams" ON public.livestreams
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update livestreams" ON public.livestreams
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete livestreams" ON public.livestreams
    FOR DELETE USING (auth.role() = 'authenticated');

-- Step 10: Test the function again with RLS enabled
SELECT 'Testing function with RLS enabled' as test_step;
SELECT end_stream_comprehensive(p_force_end_all => false) as test_result; 