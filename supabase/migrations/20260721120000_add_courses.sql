-- ============ COURSES ============
-- Groups lessons within a CEFR level into named, themed units — e.g. an A1
-- level can have separate "Greetings and Introductions" and "Personal
-- Information" courses, each with its own ordered sequence of lessons.
-- levels (CEFR container) -> courses (themed unit) -> lessons -> lesson_exercises
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  title_sorani TEXT NOT NULL,
  title_badini TEXT NOT NULL,
  title_en TEXT,
  description_sorani TEXT,
  description_badini TEXT,
  description_en TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses readable" ON public.courses FOR SELECT USING (true);
CREATE POLICY "courses admin write" ON public.courses FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Lessons now belong to a course. level_id is kept as-is (redundant with
-- courses.level_id, but every existing query that already joins lessons to
-- levels keeps working untouched) and is always set from the chosen
-- course's level by the app, so the two never diverge in practice.
ALTER TABLE public.lessons ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

-- Backfill: every level that already has lessons gets one auto-created
-- course, named after its first lesson (so existing seeded content like
-- "Greetings and Introductions" keeps that name), and all of that level's
-- lessons are attached to it. Nothing already published disappears.
INSERT INTO public.courses (level_id, order_index, title_sorani, title_badini, title_en)
SELECT
  lv.id,
  0,
  COALESCE((SELECT l2.title_sorani FROM public.lessons l2 WHERE l2.level_id = lv.id ORDER BY l2.order_index LIMIT 1), 'وانەکان'),
  COALESCE((SELECT l2.title_badini FROM public.lessons l2 WHERE l2.level_id = lv.id ORDER BY l2.order_index LIMIT 1), 'وانا'),
  (SELECT l2.title_en FROM public.lessons l2 WHERE l2.level_id = lv.id ORDER BY l2.order_index LIMIT 1)
FROM public.levels lv
WHERE EXISTS (SELECT 1 FROM public.lessons l WHERE l.level_id = lv.id);

UPDATE public.lessons l
SET course_id = c.id
FROM public.courses c
WHERE c.level_id = l.level_id AND l.course_id IS NULL;

ALTER TABLE public.lessons ALTER COLUMN course_id SET NOT NULL;
