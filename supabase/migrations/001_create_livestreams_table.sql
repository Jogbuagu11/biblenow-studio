-- Create the livestreams table with all required columns
CREATE TABLE IF NOT EXISTS public.livestreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID REFERENCES public.verified_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_live BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  embed_url TEXT,
  stream_type VARCHAR(50) DEFAULT 'video',
  platform VARCHAR(100),
  stream_key TEXT,
  thumbnail_url TEXT,
  stream_url TEXT,
  scheduled_at TIMESTAMPTZ,
  flag_count INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  stream_mode VARCHAR(50) DEFAULT 'solo',
  tags TEXT[] DEFAULT '{}',
  viewer_count INTEGER DEFAULT 0,
  max_viewers INTEGER DEFAULT 0,
  jitsi_room_config JSONB DEFAULT '{}',
  room_name VARCHAR(255),
  redirect_url TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'ended', 'scheduled'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_livestreams_streamer_id ON public.livestreams(streamer_id);
CREATE INDEX IF NOT EXISTS idx_livestreams_is_live ON public.livestreams(is_live);
CREATE INDEX IF NOT EXISTS idx_livestreams_scheduled_at ON public.livestreams(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_livestreams_platform ON public.livestreams(platform);
CREATE INDEX IF NOT EXISTS idx_livestreams_room_name ON public.livestreams(room_name);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_livestreams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_livestreams_updated_at
  BEFORE UPDATE ON public.livestreams
  FOR EACH ROW
  EXECUTE FUNCTION update_livestreams_updated_at(); 