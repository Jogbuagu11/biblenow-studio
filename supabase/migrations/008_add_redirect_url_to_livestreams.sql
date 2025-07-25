-- Add redirect_url column to livestreams table
ALTER TABLE public.livestreams 
ADD COLUMN IF NOT EXISTS redirect_url TEXT; 