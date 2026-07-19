-- ============ BOOKS ============
-- Mirrors the videos table: admin-authored content, readable by any
-- authenticated user, written only by admins. content_json holds an array
-- of paragraphs, each shaped like a transcript line:
--   { text, ku_sorani?, ku_badini?, highlights?: WordHighlight[] }
-- where WordHighlight is the same shape already used by videos.transcript_json
-- ({ id, start_index, end_index, word, part_of_speech, meaning_en,
--    meaning_ku_sorani, meaning_ku_badini }), so the reading page can reuse
-- the same tap-a-word-to-see-its-meaning interaction as the video page.
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code public.target_lang NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
  level_cefr public.cefr_level NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  cover_path TEXT,
  content_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books readable" ON public.books FOR SELECT USING (true);
CREATE POLICY "books admin write" ON public.books FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public bucket for book cover images (shown on the books page as the cover thumbnail)
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read book covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

CREATE POLICY "admin write book covers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'book-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update book covers"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'book-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete book covers"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'book-covers' AND public.has_role(auth.uid(), 'admin'));
