-- =====================================================
-- LIVESTREAMS CRUD OPERATIONS FOR USERS
-- =====================================================
-- This script provides complete CRUD functionality for users to manage their livestreams
-- Includes RLS policies, helper functions, and example operations

-- =====================================================
-- 1. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on livestreams table
ALTER TABLE public.livestreams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can delete their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can insert their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can read their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can update their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Public can view livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Allow authenticated users to delete livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Allow authenticated users to insert livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Allow authenticated users to update livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Allow authenticated users to select livestreams" ON public.livestreams;

-- 1. CREATE: Users can create livestreams with their own streamer_id
CREATE POLICY "Users can insert their own livestreams" ON public.livestreams
    FOR INSERT 
    WITH CHECK (
        auth.uid() = streamer_id 
        AND 
        EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- 2. READ: Users can read their own livestreams, public can view all
CREATE POLICY "Users can read their own livestreams" ON public.livestreams
    FOR SELECT 
    USING (
        -- Users can read their own livestreams
        (auth.uid() = streamer_id AND EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        ))
        OR 
        -- Public can view all livestreams (for discovery)
        true
    );

-- 3. UPDATE: Users can update their own livestreams
CREATE POLICY "Users can update their own livestreams" ON public.livestreams
    FOR UPDATE 
    USING (
        auth.uid() = streamer_id 
        AND 
        EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- 4. DELETE: Users can delete their own livestreams
CREATE POLICY "Users can delete their own livestreams" ON public.livestreams
    FOR DELETE 
    USING (
        auth.uid() = streamer_id 
        AND 
        EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- 2. HELPER FUNCTIONS
-- =====================================================

-- Function to get user's livestreams
CREATE OR REPLACE FUNCTION get_user_livestreams(
    user_id_param UUID,
    status_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    is_live BOOLEAN,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    embed_url TEXT,
    stream_type VARCHAR(50),
    platform VARCHAR(100),
    thumbnail_url TEXT,
    stream_url TEXT,
    scheduled_at TIMESTAMPTZ,
    flag_count INTEGER,
    is_hidden BOOLEAN,
    stream_mode VARCHAR(50),
    tags TEXT[],
    viewer_count INTEGER,
    max_viewers INTEGER,
    room_name VARCHAR(255),
    redirect_url TEXT,
    status VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.is_live,
        l.started_at,
        l.ended_at,
        l.updated_at,
        l.embed_url,
        l.stream_type,
        l.platform,
        l.thumbnail_url,
        l.stream_url,
        l.scheduled_at,
        l.flag_count,
        l.is_hidden,
        l.stream_mode,
        l.tags,
        l.viewer_count,
        l.max_viewers,
        l.room_name,
        l.redirect_url,
        l.status
    FROM public.livestreams l
    WHERE l.streamer_id = user_id_param
    AND (status_filter IS NULL OR l.status = status_filter)
    ORDER BY l.updated_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new livestream
CREATE OR REPLACE FUNCTION create_user_livestream(
    title_param VARCHAR(255),
    description_param TEXT DEFAULT NULL,
    platform_param VARCHAR(100) DEFAULT NULL,
    stream_type_param VARCHAR(50) DEFAULT 'video',
    embed_url_param TEXT DEFAULT NULL,
    stream_key_param TEXT DEFAULT NULL,
    thumbnail_url_param TEXT DEFAULT NULL,
    scheduled_at_param TIMESTAMPTZ DEFAULT NULL,
    stream_mode_param VARCHAR(50) DEFAULT 'solo',
    tags_param TEXT[] DEFAULT '{}',
    room_name_param VARCHAR(255) DEFAULT NULL,
    redirect_url_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_stream_id UUID;
    user_id UUID;
BEGIN
    -- Get current user ID
    user_id := auth.uid();
    
    -- Check if user is verified
    IF NOT EXISTS (SELECT 1 FROM public.verified_profiles WHERE user_id = user_id) THEN
        RAISE EXCEPTION 'User must be verified to create livestreams';
    END IF;
    
    -- Insert new livestream
    INSERT INTO public.livestreams (
        streamer_id,
        title,
        description,
        platform,
        stream_type,
        embed_url,
        stream_key,
        thumbnail_url,
        scheduled_at,
        stream_mode,
        tags,
        room_name,
        redirect_url,
        status
    ) VALUES (
        user_id,
        title_param,
        description_param,
        platform_param,
        stream_type_param,
        embed_url_param,
        stream_key_param,
        thumbnail_url_param,
        scheduled_at_param,
        stream_mode_param,
        tags_param,
        room_name_param,
        redirect_url_param,
        CASE 
            WHEN scheduled_at_param IS NOT NULL THEN 'scheduled'
            ELSE 'active'
        END
    ) RETURNING id INTO new_stream_id;
    
    RETURN new_stream_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a livestream
CREATE OR REPLACE FUNCTION update_user_livestream(
    stream_id UUID,
    title_param VARCHAR(255) DEFAULT NULL,
    description_param TEXT DEFAULT NULL,
    platform_param VARCHAR(100) DEFAULT NULL,
    stream_type_param VARCHAR(50) DEFAULT NULL,
    embed_url_param TEXT DEFAULT NULL,
    stream_key_param TEXT DEFAULT NULL,
    thumbnail_url_param TEXT DEFAULT NULL,
    scheduled_at_param TIMESTAMPTZ DEFAULT NULL,
    stream_mode_param VARCHAR(50) DEFAULT NULL,
    tags_param TEXT[] DEFAULT NULL,
    room_name_param VARCHAR(255) DEFAULT NULL,
    redirect_url_param TEXT DEFAULT NULL,
    is_hidden_param BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID;
    updated_count INTEGER;
BEGIN
    -- Get current user ID
    user_id := auth.uid();
    
    -- Update livestream (only if user owns it)
    UPDATE public.livestreams
    SET 
        title = COALESCE(title_param, title),
        description = COALESCE(description_param, description),
        platform = COALESCE(platform_param, platform),
        stream_type = COALESCE(stream_type_param, stream_type),
        embed_url = COALESCE(embed_url_param, embed_url),
        stream_key = COALESCE(stream_key_param, stream_key),
        thumbnail_url = COALESCE(thumbnail_url_param, thumbnail_url),
        scheduled_at = COALESCE(scheduled_at_param, scheduled_at),
        stream_mode = COALESCE(stream_mode_param, stream_mode),
        tags = COALESCE(tags_param, tags),
        room_name = COALESCE(room_name_param, room_name),
        redirect_url = COALESCE(redirect_url_param, redirect_url),
        is_hidden = COALESCE(is_hidden_param, is_hidden),
        status = CASE 
            WHEN scheduled_at_param IS NOT NULL THEN 'scheduled'
            WHEN scheduled_at_param IS NULL AND scheduled_at IS NOT NULL THEN 'active'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = stream_id 
    AND streamer_id = user_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a livestream
CREATE OR REPLACE FUNCTION delete_user_livestream(stream_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID;
    deleted_count INTEGER;
BEGIN
    -- Get current user ID
    user_id := auth.uid();
    
    -- Delete livestream (only if user owns it)
    DELETE FROM public.livestreams
    WHERE id = stream_id 
    AND streamer_id = user_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start a livestream
CREATE OR REPLACE FUNCTION start_user_livestream(stream_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID;
    updated_count INTEGER;
BEGIN
    -- Get current user ID
    user_id := auth.uid();
    
    -- Start livestream (only if user owns it and it's not already live)
    UPDATE public.livestreams
    SET 
        is_live = true,
        started_at = NOW(),
        status = 'active',
        updated_at = NOW()
    WHERE id = stream_id 
    AND streamer_id = user_id
    AND is_live = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end a livestream
CREATE OR REPLACE FUNCTION end_user_livestream(stream_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID;
    updated_count INTEGER;
BEGIN
    -- Get current user ID
    user_id := auth.uid();
    
    -- End livestream (only if user owns it and it's currently live)
    UPDATE public.livestreams
    SET 
        is_live = false,
        ended_at = NOW(),
        status = 'ended',
        updated_at = NOW()
    WHERE id = stream_id 
    AND streamer_id = user_id
    AND is_live = true;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get livestream statistics
CREATE OR REPLACE FUNCTION get_user_livestream_stats(user_id_param UUID)
RETURNS TABLE (
    total_streams INTEGER,
    active_streams INTEGER,
    scheduled_streams INTEGER,
    ended_streams INTEGER,
    total_viewers INTEGER,
    total_streaming_time_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_streams,
        COUNT(*) FILTER (WHERE is_live = true)::INTEGER as active_streams,
        COUNT(*) FILTER (WHERE status = 'scheduled')::INTEGER as scheduled_streams,
        COUNT(*) FILTER (WHERE status = 'ended')::INTEGER as ended_streams,
        COALESCE(SUM(viewer_count), 0)::INTEGER as total_viewers,
        COALESCE(SUM(
            CASE 
                WHEN started_at IS NOT NULL AND ended_at IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
                ELSE 0 
            END
        ), 0)::INTEGER as total_streaming_time_minutes
    FROM public.livestreams
    WHERE streamer_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. EXAMPLE CRUD OPERATIONS
-- =====================================================

-- Example 1: Create a new livestream
-- SELECT create_user_livestream(
--     'My First Bible Study Stream',
--     'Join me for an interactive Bible study session',
--     'prayer',
--     'video',
--     NULL,
--     NULL,
--     'https://example.com/thumbnail.jpg',
--     '2024-01-15 19:00:00+00',
--     'interactive',
--     ARRAY['bible-study', 'prayer', 'community'],
--     'bible-study-room-1',
--     'https://stream.biblenow.io/endstream'
-- );

-- Example 2: Get user's livestreams
-- SELECT * FROM get_user_livestreams(auth.uid(), 'active', 10, 0);

-- Example 3: Update a livestream
-- SELECT update_user_livestream(
--     'stream-uuid-here',
--     'Updated Bible Study Title',
--     'Updated description',
--     'qna',
--     'video',
--     NULL,
--     NULL,
--     'https://example.com/new-thumbnail.jpg',
--     '2024-01-16 20:00:00+00',
--     'solo',
--     ARRAY['bible-study', 'qna', 'teaching'],
--     'updated-room-name',
--     'https://stream.biblenow.io/endstream',
--     false
-- );

-- Example 4: Start a livestream
-- SELECT start_user_livestream('stream-uuid-here');

-- Example 5: End a livestream
-- SELECT end_user_livestream('stream-uuid-here');

-- Example 6: Delete a livestream
-- SELECT delete_user_livestream('stream-uuid-here');

-- Example 7: Get user's livestream statistics
-- SELECT * FROM get_user_livestream_stats(auth.uid());

-- =====================================================
-- 4. USEFUL QUERIES
-- =====================================================

-- Get all active livestreams (for discovery)
-- SELECT 
--     l.id,
--     l.title,
--     l.description,
--     l.platform,
--     l.thumbnail_url,
--     l.viewer_count,
--     l.started_at,
--     vp.display_name as streamer_name
-- FROM public.livestreams l
-- JOIN public.verified_profiles vp ON l.streamer_id = vp.id
-- WHERE l.is_live = true
-- AND l.is_hidden = false
-- ORDER BY l.started_at DESC;

-- Get user's scheduled streams
-- SELECT 
--     id,
--     title,
--     description,
--     scheduled_at,
--     platform,
--     thumbnail_url
-- FROM public.livestreams
-- WHERE streamer_id = auth.uid()
-- AND status = 'scheduled'
-- ORDER BY scheduled_at ASC;

-- Get user's streaming history
-- SELECT 
--     id,
--     title,
--     started_at,
--     ended_at,
--     viewer_count,
--     EXTRACT(EPOCH FROM (ended_at - started_at)) / 60 as duration_minutes
-- FROM public.livestreams
-- WHERE streamer_id = auth.uid()
-- AND status = 'ended'
-- ORDER BY ended_at DESC;

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

-- Verify RLS policies were created
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'livestreams'
ORDER BY policyname;

-- Verify functions were created
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%livestream%'
ORDER BY routine_name; 