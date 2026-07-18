-- Lesson content only ever existed in Sorani and Badini. The "English" UI
-- dialect has no authored content to fall back to, so the app was silently
-- showing Kurdish text on the dashboard/lesson pages even when a user
-- selected English. This adds real English columns for lesson titles,
-- summaries, and grammar notes so English-dialect users can see true
-- English content once it's authored (via the admin panel).

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS summary_en TEXT,
  ADD COLUMN IF NOT EXISTS grammar_md_en TEXT;

-- Seed the English title for lesson 1 of the "en" (learn-English) track,
-- which is the lesson shown on a brand-new learner's dashboard. Extend this
-- pattern for other lessons/tracks (de/ar/ko) as they get authored.
UPDATE public.lessons l
SET title_en = 'Greetings and Introductions'
FROM public.levels lv
WHERE l.level_id = lv.id
  AND lv.language_code = 'en'
  AND lv.cefr = 'A1'
  AND l.order_index = 0
  AND l.title_en IS NULL;
