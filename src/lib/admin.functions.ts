import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const langEnum = z.enum(["en", "de", "ar", "ko"]);
const cefrEnum = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error("role check failed");
  if (!data) throw new Error("Forbidden");
}

/* -------------------- IS ADMIN -------------------- */
export const getIsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: Boolean(data) };
  });

/* -------------------- ADMIN CONTENT READS -------------------- */
export const adminListLessons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ language: langEnum, cefr: cefrEnum }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: level } = await context.supabase
      .from("levels")
      .select("id")
      .eq("language_code", data.language)
      .eq("cefr", data.cefr)
      .maybeSingle();
    if (!level) return { levelId: null, lessons: [] };
    const { data: lessons } = await context.supabase
      .from("lessons")
      .select("*, lesson_exercises(*)")
      .eq("level_id", level.id)
      .order("order_index");
    return { levelId: level.id, lessons: lessons ?? [] };
  });

export const adminListVocab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ language: langEnum, cefr: cefrEnum }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: words } = await context.supabase
      .from("vocab_words")
      .select("*")
      .eq("language_code", data.language)
      .eq("level_cefr", data.cefr)
      .order("word");
    return { words: words ?? [] };
  });

export const adminListVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ language: langEnum }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: videos } = await context.supabase
      .from("videos")
      .select("*")
      .eq("language_code", data.language)
      .order("level_cefr");
    return { videos: videos ?? [] };
  });

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, display_name, ui_dialect, active_target_lang, created_at")
      .order("created_at", { ascending: false });
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }
    return {
      users: (profiles ?? []).map((p) => ({ ...p, roles: rolesByUser.get(p.id) ?? [] })),
    };
  });

/* -------------------- ADMIN WRITES -------------------- */
export const adminUpsertLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      level_id: z.string().uuid(),
      order_index: z.number().int().min(0),
      title_sorani: z.string().min(1).max(200),
      title_badini: z.string().min(1).max(200),
      summary_sorani: z.string().max(1000).optional(),
      summary_badini: z.string().max(1000).optional(),
      grammar_md_sorani: z.string().max(20000).optional(),
      grammar_md_badini: z.string().max(20000).optional(),
      dialogue_json: z.array(z.object({ speaker: z.string(), line: z.string(), translation_ku: z.string().optional() })).default([]),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const row = { ...data };
    const { data: saved, error } = await context.supabase.from("lessons").upsert(row).select().single();
    if (error) throw new Error(error.message);
    return { lesson: saved };
  });

export const adminDeleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("lessons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      lesson_id: z.string().uuid(),
      order_index: z.number().int().min(0),
      type: z.enum(["multiple_choice", "fill_blank", "translate", "listening"]),
      prompt_json: z.record(z.string(), z.unknown()),
      answer_json: z.record(z.string(), z.unknown()),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: saved, error } = await context.supabase.from("lesson_exercises").upsert(data as any).select().single();
    if (error) throw new Error(error.message);
    return { exercise: saved };
  });

export const adminDeleteExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("lesson_exercises").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertVocab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      language_code: langEnum,
      level_cefr: cefrEnum,
      topic: z.string().min(1).max(100),
      word: z.string().min(1).max(200),
      kurdish_sorani: z.string().min(1).max(200),
      kurdish_badini: z.string().min(1).max(200),
      pronunciation: z.string().max(200).optional(),
      example_sentence: z.string().max(500).optional(),
      example_sorani: z.string().max(500).optional(),
      example_badini: z.string().max(500).optional(),
      audio_url: z.string().url().max(500).optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const payload = { ...data, audio_url: data.audio_url || null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: saved, error } = await context.supabase.from("vocab_words").upsert(payload as any).select().single();
    if (error) throw new Error(error.message);
    return { word: saved };
  });

export const adminDeleteVocab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("vocab_words").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      language_code: langEnum,
      level_cefr: cefrEnum,
      youtube_id: z.string().min(1).max(50),
      title: z.string().min(1).max(300),
      description: z.string().max(2000).optional(),
      duration_seconds: z.number().int().min(0).optional(),
      transcript_json: z.array(z.object({ t: z.number().optional(), en: z.string(), ku_sorani: z.string().optional(), ku_badini: z.string().optional() })).default([]),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: saved, error } = await context.supabase.from("videos").upsert(data).select().single();
    if (error) throw new Error(error.message);
    return { video: saved };
  });

export const adminDeleteVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), role: z.enum(["admin", "user"]), grant: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_set_user_role", {
      _target_user_id: data.user_id,
      _role: data.role,
      _grant: data.grant,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------- ELEVENLABS -------------------- */
export const getElevenLabsToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ agentId: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ElevenLabs is not connected");
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(data.agentId)}`,
      { headers: { "xi-api-key": apiKey } },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ElevenLabs token error [${res.status}]: ${body}`);
    }
    const json = (await res.json()) as { token: string };
    return { token: json.token };
  });
