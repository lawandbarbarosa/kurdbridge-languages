
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.ui_dialect AS ENUM ('sorani', 'badini');
CREATE TYPE public.target_lang AS ENUM ('en', 'de', 'ar', 'ko');
CREATE TYPE public.cefr_level AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE public.exercise_type AS ENUM ('multiple_choice', 'fill_blank', 'listening', 'translate');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  ui_dialect public.ui_dialect NOT NULL DEFAULT 'sorani',
  active_target_lang public.target_lang,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  daily_goal_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles select" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ CONTENT CATALOG ============
CREATE TABLE public.languages (
  code public.target_lang PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_sorani TEXT NOT NULL,
  name_badini TEXT NOT NULL,
  flag_emoji TEXT NOT NULL
);
GRANT SELECT ON public.languages TO authenticated, anon;
GRANT ALL ON public.languages TO service_role;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "languages readable by all" ON public.languages FOR SELECT USING (true);
CREATE POLICY "languages admin write" ON public.languages FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.languages (code, name_en, name_sorani, name_badini, flag_emoji) VALUES
  ('en','English','ئینگلیزی','ئینگلیزی','🇬🇧'),
  ('de','German','ئەڵمانی','ئەڵمانی','🇩🇪'),
  ('ar','Arabic','عەرەبی','عەرەبی','🇸🇦'),
  ('ko','Korean','کۆری','کۆری','🇰🇷');

CREATE TABLE public.levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code public.target_lang NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
  cefr public.cefr_level NOT NULL,
  order_index INTEGER NOT NULL,
  UNIQUE (language_code, cefr)
);
GRANT SELECT ON public.levels TO authenticated;
GRANT ALL ON public.levels TO service_role;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "levels readable" ON public.levels FOR SELECT USING (true);
CREATE POLICY "levels admin write" ON public.levels FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.levels (language_code, cefr, order_index)
SELECT l.code, c.cefr, c.idx
FROM public.languages l
CROSS JOIN (VALUES ('A1'::public.cefr_level,1),('A2',2),('B1',3),('B2',4),('C1',5),('C2',6)) AS c(cefr, idx);

-- ============ LESSONS ============
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title_sorani TEXT NOT NULL,
  title_badini TEXT NOT NULL,
  summary_sorani TEXT,
  summary_badini TEXT,
  grammar_md_sorani TEXT,
  grammar_md_badini TEXT,
  dialogue_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons readable" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "lessons admin write" ON public.lessons FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.lesson_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  type public.exercise_type NOT NULL,
  prompt_json JSONB NOT NULL,
  answer_json JSONB NOT NULL
);
GRANT SELECT ON public.lesson_exercises TO authenticated;
GRANT ALL ON public.lesson_exercises TO service_role;
ALTER TABLE public.lesson_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises readable" ON public.lesson_exercises FOR SELECT USING (true);
CREATE POLICY "exercises admin write" ON public.lesson_exercises FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_lesson_progress TO authenticated;
GRANT ALL ON public.user_lesson_progress TO service_role;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lesson progress" ON public.user_lesson_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ VOCABULARY ============
CREATE TABLE public.vocab_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code public.target_lang NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
  level_cefr public.cefr_level NOT NULL,
  topic TEXT NOT NULL,
  word TEXT NOT NULL,
  kurdish_sorani TEXT NOT NULL,
  kurdish_badini TEXT NOT NULL,
  example_sentence TEXT,
  example_sorani TEXT,
  example_badini TEXT,
  audio_url TEXT
);
GRANT SELECT ON public.vocab_words TO authenticated;
GRANT ALL ON public.vocab_words TO service_role;
ALTER TABLE public.vocab_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vocab readable" ON public.vocab_words FOR SELECT USING (true);
CREATE POLICY "vocab admin write" ON public.vocab_words FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_vocab_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.vocab_words(id) ON DELETE CASCADE,
  box INTEGER NOT NULL DEFAULT 1,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_vocab_progress TO authenticated;
GRANT ALL ON public.user_vocab_progress TO service_role;
ALTER TABLE public.user_vocab_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vocab progress" ON public.user_vocab_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ VIDEOS ============
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code public.target_lang NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
  level_cefr public.cefr_level NOT NULL,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_seconds INTEGER,
  transcript_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "videos readable" ON public.videos FOR SELECT USING (true);
CREATE POLICY "videos admin write" ON public.videos FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ PLACEMENT ============
CREATE TABLE public.placement_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code public.target_lang NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
  difficulty_band public.cefr_level NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  question_json JSONB NOT NULL,
  answer_json JSONB NOT NULL
);
GRANT SELECT ON public.placement_questions TO authenticated;
GRANT ALL ON public.placement_questions TO service_role;
ALTER TABLE public.placement_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "placement q readable" ON public.placement_questions FOR SELECT USING (true);
CREATE POLICY "placement q admin write" ON public.placement_questions FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.placement_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language_code public.target_lang NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  assigned_cefr public.cefr_level,
  answers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.placement_attempts TO authenticated;
GRANT ALL ON public.placement_attempts TO service_role;
ALTER TABLE public.placement_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own placement" ON public.placement_attempts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Track user's current level per language (updated after placement or lesson unlocks)
CREATE TABLE public.user_language_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language_code public.target_lang NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
  current_cefr public.cefr_level NOT NULL DEFAULT 'A1',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, language_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_language_levels TO authenticated;
GRANT ALL ON public.user_language_levels TO service_role;
ALTER TABLE public.user_language_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lang levels" ON public.user_language_levels FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_user_lang_levels_updated BEFORE UPDATE ON public.user_language_levels
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_user_vocab_updated BEFORE UPDATE ON public.user_vocab_progress
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
