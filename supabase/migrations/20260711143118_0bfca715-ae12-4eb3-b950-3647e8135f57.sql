CREATE POLICY "authenticated read videos bucket"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'videos');

CREATE POLICY "admin write videos bucket"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update videos bucket"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete videos bucket"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'));