-- Remove redundant category column from livestreams table
-- platform already serves the same purpose (prayer, qna, lecture, study, reading, worship, livestream, external)
ALTER TABLE public.livestreams DROP COLUMN IF EXISTS category; 