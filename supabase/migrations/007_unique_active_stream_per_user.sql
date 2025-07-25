-- Enforce only one active livestream per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_stream_per_user
ON public.livestreams (streamer_id)
WHERE is_live = true; 