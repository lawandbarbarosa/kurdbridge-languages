import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useDialect } from "@/hooks/use-dialect";
import {
  getIsAdmin,
  adminListLessons,
  adminListVocab,
  adminListVideos,
  adminListUsers,
  adminUpsertLesson,
  adminDeleteLesson,
  adminUpsertVocab,
  adminDeleteVocab,
  adminUpsertVideo,
  adminDeleteVideo,
  adminSetUserRole,
  transcribeVideoFile,
  translateTranscriptLines,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { mode: "signin" } });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

type Tab = "lessons" | "vocab" | "videos" | "users";
const LANGS = ["en", "de", "ar", "ko"] as const;
const CEFRS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function AdminPage() {
  const { t } = useDialect();
  const [tab, setTab] = useState<Tab>("lessons");
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold">{t("admin")}</h1>
      </div>
      <div className="mb-6 flex gap-2 flex-wrap">
        {(["lessons", "vocab", "videos", "users"] as Tab[]).map((v) => (
          <Button key={v} variant={tab === v ? "default" : "outline"} onClick={() => setTab(v)}>
            {t(`admin_${v}` as never)}
          </Button>
        ))}
      </div>
      {tab === "lessons" && <LessonsTab />}
      {tab === "vocab" && <VocabTab />}
      {tab === "videos" && <VideosTab />}
      {tab === "users" && <UsersTab />}
    </AppShell>
  );
}

function LangCefrPicker({ lang, setLang, cefr, setCefr }: { lang: string; setLang: (v: string) => void; cefr: string; setCefr: (v: string) => void }) {
  return (
    <div className="flex gap-2 mb-4">
      <Select value={lang} onValueChange={setLang}>
        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
        <SelectContent>{LANGS.map((l) => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={cefr} onValueChange={setCefr}>
        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
        <SelectContent>{CEFRS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function LessonsTab() {
  const { t } = useDialect();
  const qc = useQueryClient();
  const [lang, setLang] = useState("en");
  const [cefr, setCefr] = useState("A1");
  const list = useServerFn(adminListLessons);
  const upsert = useServerFn(adminUpsertLesson);
  const del = useServerFn(adminDeleteLesson);
  const q = useQuery({ queryKey: ["admin-lessons", lang, cefr], queryFn: () => list({ data: { language: lang as never, cefr: cefr as never } }) });
  const [editing, setEditing] = useState<null | Record<string, unknown>>(null);
  const [open, setOpen] = useState(false);

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => upsert({ data: payload as never }),
    onSuccess: () => { toast.success(t("saved")); qc.invalidateQueries({ queryKey: ["admin-lessons"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success(t("deleted")); qc.invalidateQueries({ queryKey: ["admin-lessons"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    if (!q.data?.levelId) { toast.error("No level for this language/CEFR. Add one in the database first."); return; }
    setEditing({ level_id: q.data.levelId, order_index: (q.data.lessons.length ?? 0), title_sorani: "", title_badini: "", dialogue_json: [] });
    setOpen(true);
  };

  return (
    <div>
      <LangCefrPicker lang={lang} setLang={setLang} cefr={cefr} setCefr={setCefr} />
      <div className="flex justify-end mb-4"><Button onClick={openNew}>{t("add_new")}</Button></div>
      <div className="grid gap-3">
        {(q.data?.lessons ?? []).length === 0 && <p className="text-muted-foreground">{t("no_data")}</p>}
        {(q.data?.lessons ?? []).map((l) => (
          <Card key={l.id}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <div className="font-medium">{l.order_index + 1}. {l.title_sorani}</div>
                <div className="text-sm text-muted-foreground">{l.title_badini}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing(l as unknown as Record<string, unknown>); setOpen(true); }}>{t("edit")}</Button>
                <Button variant="destructive" size="sm" onClick={() => { if (confirm(t("confirm_delete"))) remove.mutate(l.id); }}>{t("delete")}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin_lessons")}</DialogTitle></DialogHeader>
          {editing && (
            <LessonForm value={editing} onChange={setEditing} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LessonForm({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Order</Label><Input type="number" value={value.order_index as number} onChange={(e) => set("order_index", Number(e.target.value))} /></div>
        <div><Label>Title (Sorani)</Label><Input value={(value.title_sorani ?? "") as string} onChange={(e) => set("title_sorani", e.target.value)} /></div>
      </div>
      <div><Label>Title (Badini)</Label><Input value={(value.title_badini ?? "") as string} onChange={(e) => set("title_badini", e.target.value)} /></div>
      <div><Label>Summary (Sorani)</Label><Textarea value={(value.summary_sorani ?? "") as string} onChange={(e) => set("summary_sorani", e.target.value)} /></div>
      <div><Label>Summary (Badini)</Label><Textarea value={(value.summary_badini ?? "") as string} onChange={(e) => set("summary_badini", e.target.value)} /></div>
      <div><Label>Grammar (Sorani, Markdown)</Label><Textarea rows={5} value={(value.grammar_md_sorani ?? "") as string} onChange={(e) => set("grammar_md_sorani", e.target.value)} /></div>
      <div><Label>Grammar (Badini, Markdown)</Label><Textarea rows={5} value={(value.grammar_md_badini ?? "") as string} onChange={(e) => set("grammar_md_badini", e.target.value)} /></div>
      <div>
        <Label>Dialogue JSON: [{"{"}"speaker","line","translation_ku"{"}"}]</Label>
        <Textarea rows={4} value={JSON.stringify(value.dialogue_json ?? [], null, 2)} onChange={(e) => { try { set("dialogue_json", JSON.parse(e.target.value)); } catch { /* keep typing */ } }} />
      </div>
    </div>
  );
}

function VocabTab() {
  const { t } = useDialect();
  const qc = useQueryClient();
  const [lang, setLang] = useState("en");
  const [cefr, setCefr] = useState("A1");
  const list = useServerFn(adminListVocab);
  const upsert = useServerFn(adminUpsertVocab);
  const del = useServerFn(adminDeleteVocab);
  const q = useQuery({ queryKey: ["admin-vocab", lang, cefr], queryFn: () => list({ data: { language: lang as never, cefr: cefr as never } }) });
  const [editing, setEditing] = useState<null | Record<string, unknown>>(null);
  const [open, setOpen] = useState(false);

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => upsert({ data: payload as never }),
    onSuccess: () => { toast.success(t("saved")); qc.invalidateQueries({ queryKey: ["admin-vocab"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success(t("deleted")); qc.invalidateQueries({ queryKey: ["admin-vocab"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <LangCefrPicker lang={lang} setLang={setLang} cefr={cefr} setCefr={setCefr} />
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditing({ language_code: lang, level_cefr: cefr, topic: "general", word: "", kurdish_sorani: "", kurdish_badini: "" }); setOpen(true); }}>{t("add_new")}</Button>
      </div>
      <div className="grid gap-2">
        {(q.data?.words ?? []).length === 0 && <p className="text-muted-foreground">{t("no_data")}</p>}
        {(q.data?.words ?? []).map((w) => (
          <Card key={w.id}>
            <CardContent className="p-3 flex justify-between items-center">
              <div>
                <div className="font-medium">{w.word} <span className="text-muted-foreground text-sm">— {w.kurdish_sorani}</span></div>
                <div className="text-xs text-muted-foreground">{w.topic} · {w.level_cefr}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing(w as unknown as Record<string, unknown>); setOpen(true); }}>{t("edit")}</Button>
                <Button variant="destructive" size="sm" onClick={() => { if (confirm(t("confirm_delete"))) remove.mutate(w.id); }}>{t("delete")}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin_vocab")}</DialogTitle></DialogHeader>
          {editing && <VocabForm value={editing} onChange={setEditing} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VocabForm({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Language</Label>
          <Select value={value.language_code as string} onValueChange={(v) => set("language_code", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LANGS.map((l) => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>CEFR</Label>
          <Select value={value.level_cefr as string} onValueChange={(v) => set("level_cefr", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CEFRS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Topic</Label><Input value={(value.topic ?? "") as string} onChange={(e) => set("topic", e.target.value)} /></div>
      <div><Label>Word</Label><Input value={(value.word ?? "") as string} onChange={(e) => set("word", e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Kurdish (Sorani)</Label><Input value={(value.kurdish_sorani ?? "") as string} onChange={(e) => set("kurdish_sorani", e.target.value)} /></div>
        <div><Label>Kurdish (Badini)</Label><Input value={(value.kurdish_badini ?? "") as string} onChange={(e) => set("kurdish_badini", e.target.value)} /></div>
      </div>
      <div><Label>Pronunciation</Label><Input value={(value.pronunciation ?? "") as string} onChange={(e) => set("pronunciation", e.target.value)} /></div>
      <div><Label>Example sentence</Label><Input value={(value.example_sentence ?? "") as string} onChange={(e) => set("example_sentence", e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Example (Sorani)</Label><Input value={(value.example_sorani ?? "") as string} onChange={(e) => set("example_sorani", e.target.value)} /></div>
        <div><Label>Example (Badini)</Label><Input value={(value.example_badini ?? "") as string} onChange={(e) => set("example_badini", e.target.value)} /></div>
      </div>
      <div><Label>Audio URL</Label><Input value={(value.audio_url ?? "") as string} onChange={(e) => set("audio_url", e.target.value)} /></div>
    </div>
  );
}

function VideosTab() {
  const { t } = useDialect();
  const qc = useQueryClient();
  const [lang, setLang] = useState("en");
  const list = useServerFn(adminListVideos);
  const upsert = useServerFn(adminUpsertVideo);
  const del = useServerFn(adminDeleteVideo);
  const q = useQuery({ queryKey: ["admin-videos", lang], queryFn: () => list({ data: { language: lang as never } }) });
  const [editing, setEditing] = useState<null | Record<string, unknown>>(null);
  const [open, setOpen] = useState(false);

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => upsert({ data: payload as never }),
    onSuccess: () => { toast.success(t("saved")); qc.invalidateQueries({ queryKey: ["admin-videos"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success(t("deleted")); qc.invalidateQueries({ queryKey: ["admin-videos"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex gap-2 mb-4 items-center">
        <Select value={lang} onValueChange={setLang}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{LANGS.map((l) => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex-1" />
        <Button onClick={() => { setEditing({ language_code: lang, level_cefr: "A1", title: "", video_path: "", youtube_id: "", transcript_json: [] }); setOpen(true); }}>{t("add_new")}</Button>
      </div>
      <div className="grid gap-2">
        {(q.data?.videos ?? []).length === 0 && <p className="text-muted-foreground">{t("no_data")}</p>}
        {(q.data?.videos ?? []).map((v) => (
          <Card key={v.id}>
            <CardContent className="p-3 flex justify-between items-center">
              <div>
                <div className="font-medium">{v.title}</div>
                <div className="text-xs text-muted-foreground">{v.level_cefr} · {v.video_path ? "uploaded" : v.youtube_id ? `YT: ${v.youtube_id}` : "no source"}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing(v as unknown as Record<string, unknown>); setOpen(true); }}>{t("edit")}</Button>
                <Button variant="destructive" size="sm" onClick={() => { if (confirm(t("confirm_delete"))) remove.mutate(v.id); }}>{t("delete")}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin_videos")}</DialogTitle></DialogHeader>
          {editing && <VideoForm value={editing} onChange={setEditing} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VideoForm({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const transcribe = useServerFn(transcribeVideoFile);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${(value.language_code as string) || "en"}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("videos").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      set("video_path", path);
      toast.success("Uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onTranscribe = async () => {
    if (!value.video_path) { toast.error("Upload a video first"); return; }
    setTranscribing(true);
    try {
      const res = await transcribe({ data: { path: value.video_path as string } });
      set("transcript_json", res.lines);
      toast.success(`Transcribed ${res.lines.length} lines`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Language</Label>
          <Select value={value.language_code as string} onValueChange={(v) => set("language_code", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LANGS.map((l) => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>CEFR</Label>
          <Select value={value.level_cefr as string} onValueChange={(v) => set("level_cefr", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CEFRS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Title</Label><Input value={(value.title ?? "") as string} onChange={(e) => set("title", e.target.value)} /></div>
      <div><Label>Description</Label><Textarea value={(value.description ?? "") as string} onChange={(e) => set("description", e.target.value)} /></div>

      <div className="rounded-md border p-3 bg-muted/30 grid gap-2">
        <Label>Video file</Label>
        <Input type="file" accept="video/*" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
        {value.video_path ? <p className="text-xs text-muted-foreground">Uploaded: {value.video_path as string}</p> : <p className="text-xs text-muted-foreground">MP4 recommended. Uploads go to the private videos bucket.</p>}
        {uploading && <p className="text-xs">Uploading…</p>}
        <div className="flex gap-2 mt-1">
          <Button type="button" size="sm" variant="secondary" onClick={onTranscribe} disabled={!value.video_path || transcribing}>
            {transcribing ? "Transcribing…" : "Auto-transcribe (ElevenLabs)"}
          </Button>
        </div>
      </div>

      <TranscriptEditor
        value={(value.transcript_json as TranscriptLine[]) ?? []}
        onChange={(lines) => set("transcript_json", lines)}
      />
    </div>
  );
}

interface TranscriptLine { t?: number; en: string; ku_sorani?: string; ku_badini?: string }

function TranscriptEditor({ value, onChange }: { value: TranscriptLine[]; onChange: (v: TranscriptLine[]) => void }) {
  const update = (i: number, patch: Partial<TranscriptLine>) => {
    const next = value.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...value, { en: "", ku_sorani: "", ku_badini: "" }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>Transcript lines</Label>
        <Button type="button" size="sm" variant="outline" onClick={add}>+ Add line</Button>
      </div>
      {value.length === 0 && <p className="text-xs text-muted-foreground">No lines yet. Click "Add line" to start.</p>}
      {value.map((line, i) => (
        <div key={i} className="rounded-md border p-3 grid gap-2 bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Line {i + 1}</span>
            <Input type="number" step="0.1" className="w-24 h-7" placeholder="t (s)" value={line.t ?? 0} onChange={(e) => update(i, { t: Number(e.target.value) })} />
            <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>✕</Button>
          </div>
          <Input placeholder="English line" dir="ltr" value={line.en} onChange={(e) => update(i, { en: e.target.value })} />
          <Input placeholder="Kurdish (Sorani) translation" value={line.ku_sorani ?? ""} onChange={(e) => update(i, { ku_sorani: e.target.value })} />
          <Input placeholder="Kurdish (Badini) translation" value={line.ku_badini ?? ""} onChange={(e) => update(i, { ku_badini: e.target.value })} />
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const { t } = useDialect();
  const qc = useQueryClient();
  const list = useServerFn(adminListUsers);
  const setRole = useServerFn(adminSetUserRole);
  const q = useQuery({ queryKey: ["admin-users"], queryFn: () => list({}) });
  const m = useMutation({
    mutationFn: async (args: { user_id: string; grant: boolean }) => setRole({ data: { user_id: args.user_id, role: "admin", grant: args.grant } }),
    onSuccess: () => { toast.success(t("saved")); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="grid gap-2">
      {(q.data?.users ?? []).length === 0 && <p className="text-muted-foreground">{t("no_data")}</p>}
      {(q.data?.users ?? []).map((u) => {
        const isAdmin = u.roles.includes("admin");
        return (
          <Card key={u.id}>
            <CardContent className="p-3 flex justify-between items-center">
              <div>
                <div className="font-medium">{u.display_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{u.id.slice(0, 8)} · {u.ui_dialect}</div>
                <div className="mt-1 flex gap-1">{u.roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}</div>
              </div>
              <Button variant={isAdmin ? "destructive" : "default"} size="sm" onClick={() => m.mutate({ user_id: u.id, grant: !isAdmin })}>
                {isAdmin ? t("revoke_admin") : t("promote_admin")}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// suppress unused import warnings
export { getIsAdmin, DialogTrigger, CardHeader, CardTitle };
