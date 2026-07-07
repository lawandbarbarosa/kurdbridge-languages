
# Kurdish Language Learning Platform — MVP Plan

A full scaffold covering all 6 phases at once: auth, placement test, CEFR level tree, vocab flashcards, video practice, progress/streaks — for all 4 target languages (English, German, Arabic, Korean) with a Kurdish Sorani/Badini UI toggle. Initial lesson/vocab content is AI-generated at build time and stored in the database so you can review and edit later.

## What you'll get

- Kurdish-first UI (RTL, Arabic script) with a Sorani ↔ Badini toggle in every screen.
- Sign up / sign in with email + password and Google.
- Onboarding: pick target language (EN / DE / AR / KO) → take a ~20 question placement test → land on A1/A2/B1 with the right lessons unlocked.
- Learner dashboard: current level badge, streak, daily-goal ring, "continue lesson" card, and a visual lesson skill-tree with locked/unlocked/completed states.
- Lessons: grammar explanation in Kurdish, example dialogue, exercises (multiple choice, fill-in-blank, listening), end-of-lesson quiz with 70% pass threshold to unlock the next node.
- Vocabulary: word lists per level/topic, flashcard mode (target word → Kurdish meaning → example), simple spaced repetition (missed words resurface sooner), TTS pronunciation via Lovable AI.
- Video practice: curated YouTube clips per level, line-by-line transcript with a Kurdish translation toggle, and an "attempt then reveal" mode.
- Progress: per-language level, daily streak, lesson completion, vocab mastery counts.

## Design step (before building UI)

Right after the plan is approved I'll:
1. Ask three visual questions in one round — palette, typography pair, layout — so the taste is pinned.
2. Generate 3 rendered design directions for the learner dashboard (RTL Kurdish, CEFR badge, lesson tree, streak) and let you pick one.
3. Build the whole app against that chosen direction.

## Build order (single scaffold, not staged shipping)

1. Enable Lovable Cloud; scaffold Kurdish (RTL) i18n with Sorani + Badini string tables.
2. Auth: email/password + Google, profile row on signup, Kurdish-language auth screens.
3. Database schema + AI content seeding migration (see Technical section).
4. Onboarding: language pick → placement test → level assignment.
5. Learner dashboard + lesson tree UI (using chosen design direction).
6. Lesson runner (steps: intro → exercises → quiz → unlock next).
7. Vocabulary flashcards with simple SRS + TTS.
8. Video practice screen.
9. Streak + daily goal + "continue where you left off".
10. Polish, RTL audit, empty-states.

## Technical section

**Stack:** TanStack Start (existing), Lovable Cloud (Supabase) for auth/DB/storage, Lovable AI Gateway for content generation + TTS, `openai/gpt-5.5` for text, `openai/gpt-4o-mini-tts` for audio.

**i18n:** lightweight in-repo dictionary (`src/i18n/{sorani,badini}.ts`), `dir="rtl"` on `<html>`, dialect stored in `profiles.ui_dialect`. No i18n library needed for MVP.

**Database (public schema, RLS on, GRANTs per rules):**
- `profiles` (id → auth.users, display_name, ui_dialect, active_target_lang, streak_count, last_active_date)
- `user_roles` + `app_role` enum + `has_role()` SECURITY DEFINER (per user-roles rules; admin role for content editing later)
- `languages` (code PK: 'en'|'de'|'ar'|'ko', name_sorani, name_badini)
- `levels` (id, language_code, cefr: 'A1'..'C2', order_index)
- `lessons` (id, level_id, order_index, title_sorani, title_badini, grammar_md_sorani, grammar_md_badini, dialogue_json)
- `lesson_exercises` (id, lesson_id, order_index, type, prompt_json, answer_json)
- `user_lesson_progress` (user_id, lesson_id, score, passed, completed_at)
- `vocab_words` (id, language_code, level_cefr, topic, word, kurdish_sorani, kurdish_badini, example_sentence, audio_url nullable)
- `user_vocab_progress` (user_id, word_id, box, next_review_at) — Leitner-style SRS
- `videos` (id, language_code, level_cefr, youtube_id, title, transcript_json — array of {t_start, text, sorani, badini})
- `placement_questions` (id, language_code, difficulty_band, question_json, answer_json)
- `placement_attempts` (id, user_id, language_code, score, assigned_cefr, taken_at)

**Content seeding:** a migration inserts language/level rows and a one-shot server function (admin-gated via `has_role('admin')`) generates initial content per (language, A1) using `openai/gpt-5.5` structured output — 8 lessons, ~60 vocab words, 20 placement questions, and 3 hand-picked YouTube IDs per language with AI-generated Kurdish transcript translations. I'll run this once at the end of the build so the app opens with real content. TTS for vocab is generated lazily on first request and cached to Supabase Storage.

**Server functions (`src/lib/*.functions.ts`):**
- `startPlacement`, `submitPlacementAnswer`, `finalizePlacement`
- `getDashboard(languageCode)`, `getLessonTree(languageCode)`
- `getLesson(lessonId)`, `submitLessonQuiz(lessonId, answers)` → updates progress, unlocks next
- `getDueFlashcards(languageCode)`, `reviewFlashcard(wordId, correct)`
- `getVideo(id)`, `getVideosForLevel(languageCode)`
- `ttsForWord(wordId)` — server-side call to Lovable AI TTS, cached to storage
- Admin-only: `seedInitialContent(languageCode)`

**Routes:** `/auth`, `/onboarding`, `/_authenticated/dashboard`, `/_authenticated/placement/$lang`, `/_authenticated/learn/$lang`, `/_authenticated/lesson/$id`, `/_authenticated/vocab/$lang`, `/_authenticated/video/$id`, `/_authenticated/settings`. Uses the integration-managed `_authenticated` gate.

**Security:** RLS everywhere; `user_*` tables scoped by `auth.uid()`; content tables (`lessons`, `vocab_words`, etc.) readable by `authenticated`, writable only by `admin` via `has_role`. Zod validation on every server fn input.

## Deliberately out of scope for this MVP

- Speaking/pronunciation grading, chat with AI tutor, leaderboards/social, mobile app, payments, admin CMS UI (edit content via DB for now), C1/C2 levels (schema supports them; content seeded only for A1 to keep first build tractable — A2/B1 seedable via same admin function later).

Reply "approve" (or "looks good") to start with the design questions and build.
