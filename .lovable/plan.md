# Admin panel + Realtime speaking bot

## 1. Admin access (first-signup rule)

- Migration: trigger on `auth.users` insert — if `public.user_roles` is empty, insert `(new.id, 'admin')`. Later signups get no role by default.
- Existing `has_role(uid, 'admin')` function drives everything.
- Admin can be granted to others from the Admin → Users tab.

### RLS updates for content tables
Currently `lessons`, `videos`, `vocab_words`, `lesson_exercises`, `levels`, `languages` are read-only for users. Add admin-only INSERT/UPDATE/DELETE policies (`public.has_role(auth.uid(), 'admin')`).

## 2. Admin page — `/admin`

New pathless layout `_authenticated/_admin/route.tsx` — `beforeLoad` throws redirect to `/dashboard` unless the caller is admin (via a `getIsAdmin` server fn using `requireSupabaseAuth` + `has_role` RPC).

Tabs (single page with sub-nav):

- **Lessons** — pick language + level → list lessons; create/edit form (title, position, grammar markdown, dialogue JSON, quiz threshold). Add/remove exercises inline (type: multiple-choice / fill-blank / translate; prompt, answer, options).
- **Vocabulary (Flashcards)** — pick language + level → list vocab; create/edit (word, translation_ku, pronunciation, example, example_ku, part_of_speech, audio_url).
- **Videos** — pick language → list videos; create/edit (title, youtube_id, level, transcript, translation_ku, duration).
- **Users** — list profiles + current admins; promote/demote toggle (uses admin-only `set_user_role` RPC).

All forms are dialect-aware and use existing shadcn `Dialog` + `Form` components. Header shows an Admin link only when `isAdmin` context is true.

## 3. Realtime speaking bot — `/speak`

New protected route `/_authenticated/speak.tsx`.

- Uses ElevenLabs Conversational Agents via `@elevenlabs/react` `useConversation` hook (WebRTC).
- Server fn `getElevenLabsToken` (auth-gated) fetches a WebRTC conversation token from `https://api.elevenlabs.io/v1/convai/conversation/token` using the connector-synced `ELEVENLABS_API_KEY`. Token is single-use, ~1min TTL — never exposed at build time.
- Agent config is done **once in the ElevenLabs dashboard** with a system prompt like: *"You are an English tutor for Kurdish speakers. Chat naturally in English. When the user makes an English mistake, briefly correct it in Kurdish (script matches the user's chosen dialect) then continue the conversation in English."* — I'll give the user the exact prompt + link to paste in.
- UI shows: mic button (start/end), live captions of both user + agent transcripts (from `onMessage` events), an "isSpeaking" indicator, and the Kurdish correction feed. Dialect-aware (Sorani/Badini/English UI).

### Connector setup
ElevenLabs is a standard connector. I'll trigger `standard_connectors--connect` for `elevenlabs` — you'll paste your ElevenLabs API key once and create an agent in their dashboard, then paste the agent ID into Settings → Speaking bot (stored in `profiles.elevenlabs_agent_id` per user? No — a single app-wide agent stored as `VITE_ELEVENLABS_AGENT_ID` env is simpler; I'll go with that).

## Deliverables
- 1 migration (admin trigger, RLS, `set_user_role` RPC, `elevenlabs_agent_id` config)
- 5 new routes: `_admin/route`, `_admin/index`, `_admin/lessons`, `_admin/vocab`, `_admin/videos`, `_admin/users`, plus `/speak`
- Server functions: `getIsAdmin`, `adminUpsertLesson`, `adminUpsertVocab`, `adminUpsertVideo`, `adminSetUserRole`, `getElevenLabsToken`
- i18n keys added to sorani/badini/english
- Header shows Admin + Speak links when applicable

## Setup you'll do after I ship
1. Approve migration.
2. Approve ElevenLabs connector (I'll prompt).
3. Create an agent at elevenlabs.io → Agents, paste the system prompt I'll give you, copy the agent ID.
4. I'll add it as a public env var (`VITE_ELEVENLABS_AGENT_ID`) via a secret.

Sound good? Reply "go" and I'll build it end-to-end.
