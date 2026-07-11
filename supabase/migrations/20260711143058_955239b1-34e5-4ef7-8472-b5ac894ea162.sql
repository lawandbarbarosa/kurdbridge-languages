ALTER TABLE public.videos ALTER COLUMN youtube_id DROP NOT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS video_path text;