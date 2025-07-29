-- =====================================================
-- SIMPLIFIED LIVESTREAMS CRUD OPERATIONS
-- =====================================================
-- Essential CRUD functions for frontend integration

-- Enable RLS
ALTER TABLE public.livestreams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can delete their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can insert their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can read their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can update their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Public can view livestreams" ON public.livestreams;

-- Create RLS policies
CREATE POLICY "Users can insert their own livestreams" ON public.livestreams
    FOR INSERT WITH CHECK (auth.uid() = streamer_id);

CREATE POLICY "Users can read their own livestreams" ON public.livestreams
    FOR SELECT USING (auth.uid() = streamer_id OR true);

CREATE POLICY "Users can update their own livestreams" ON public.livestreams
    FOR UPDATE USING (auth.uid() = streamer_id);

CREATE POLICY "Users can delete their own livestreams" ON public.livestreams
    FOR DELETE USING (auth.uid() = streamer_id);

-- =====================================================
-- ESSENTIAL FUNCTIONS
-- =====================================================

-- Create livestream
CREATE OR REPLACE FUNCTION create_livestream(
    p_title VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_platform VARCHAR(100) DEFAULT NULL,
    p_thumbnail_url TEXT DEFAULT NULL,
    p_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO public.livestreams (
        streamer_id,
        title,
        description,
        platform,
        thumbnail_url,
        scheduled_at,
        status
    ) VALUES (
        auth.uid(),
        p_title,
        p_description,
        p_platform,
        p_thumbnail_url,
        p_scheduled_at,
        CASE WHEN p_scheduled_at IS NOT NULL THEN 'scheduled' ELSE 'active' END
    ) RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update livestream
CREATE OR REPLACE FUNCTION update_livestream(
    p_id UUID,
    p_title VARCHAR(255) DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_platform VARCHAR(100) DEFAULT NULL,
    p_thumbnail_url TEXT DEFAULT NULL,
    p_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.livestreams
    SET 
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        platform = COALESCE(p_platform, platform),
        thumbnail_url = COALESCE(p_thumbnail_url, thumbnail_url),
        scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
        status = CASE 
            WHEN p_scheduled_at IS NOT NULL THEN 'scheduled'
            WHEN p_scheduled_at IS NULL AND scheduled_at IS NOT NULL THEN 'active'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = p_id AND streamer_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete livestream
CREATE OR REPLACE FUNCTION delete_livestream(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.livestreams
    WHERE id = p_id AND streamer_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Start livestream
CREATE OR REPLACE FUNCTION start_livestream(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.livestreams
    SET 
        is_live = true,
        started_at = NOW(),
        status = 'active',
        updated_at = NOW()
    WHERE id = p_id AND streamer_id = auth.uid() AND is_live = false;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- End livestream
CREATE OR REPLACE FUNCTION end_livestream(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.livestreams
    SET 
        is_live = false,
        ended_at = NOW(),
        status = 'ended',
        updated_at = NOW()
    WHERE id = p_id AND streamer_id = auth.uid() AND is_live = true;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's livestreams
CREATE OR REPLACE FUNCTION get_my_livestreams(
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    is_live BOOLEAN,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    platform VARCHAR(100),
    thumbnail_url TEXT,
    scheduled_at TIMESTAMPTZ,
    status VARCHAR(50),
    viewer_count INTEGER,
    updated_at TIMESTAMPTZ
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
        l.platform,
        l.thumbnail_url,
        l.scheduled_at,
        l.status,
        l.viewer_count,
        l.updated_at
    FROM public.livestreams l
    WHERE l.streamer_id = auth.uid()
    AND (p_status IS NULL OR l.status = p_status)
    ORDER BY l.updated_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get livestream by ID
CREATE OR REPLACE FUNCTION get_livestream(p_id UUID)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    is_live BOOLEAN,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    platform VARCHAR(100),
    thumbnail_url TEXT,
    scheduled_at TIMESTAMPTZ,
    status VARCHAR(50),
    viewer_count INTEGER,
    updated_at TIMESTAMPTZ
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
        l.platform,
        l.thumbnail_url,
        l.scheduled_at,
        l.status,
        l.viewer_count,
        l.updated_at
    FROM public.livestreams l
    WHERE l.id = p_id
    AND (l.streamer_id = auth.uid() OR true); -- Allow public read
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 