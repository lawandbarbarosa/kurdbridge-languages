-- Add banner image path for video thumbnails
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS banner_path text;

-- Public bucket for video banner images (thumbnails shown on the videos page)
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-banners', 'video-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read video banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'video-banners');

CREATE POLICY "admin write video banners"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'video-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update video banners"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'video-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete video banners"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'video-banners' AND public.has_role(auth.uid(), 'admin'));
