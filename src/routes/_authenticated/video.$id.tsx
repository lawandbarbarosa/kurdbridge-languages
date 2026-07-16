import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { getVideo } from "@/lib/learn.functions";
import { supabase } from "@/integrations/supabase/client";
import { useDialect } from "@/hooks/use-dialect";
import type { TranslationKey } from "@/i18n/sorani";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const paramsSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/_authenticated/video/$id")({
  parseParams: (p) => paramsSchema.parse(p),
  component: VideoView,
});

interface WordHighlight {
  id: string;
  start_index: number;
  end_index: number;
  word: string;
  part_of_speech: string;
  meaning_en: string;
  meaning_ku_sorani: string;
  meaning_ku_badini: string;
}

interface TranscriptLine { t?: number; en: string; ku_sorani?: string; ku_badini?: string; highlights?: WordHighlight[] }

function tokenizeWords(text: string): string[] {
  return (text || "").split(/\s+/).filter(Boolean);
}

const POS_KEYS = ["noun", "verb", "adjective", "adverb", "phrase", "other"] as const;

interface TextSegment { text: string; highlight?: WordHighlight }

/** Groups a line's words into plain-text and highlighted-phrase segments for rendering. */
function buildSegments(words: string[], highlights: WordHighlight[]): TextSegment[] {
  const segments: TextSegment[] = [];
  let i = 0;
  while (i < words.length) {
    const hl = highlights.find((h) => h.start_index === i && h.end_index >= i && h.end_index < words.length);
    if (hl) {
      segments.push({ text: words.slice(hl.start_index, hl.end_index + 1).join(" "), highlight: hl });
      i = hl.end_index + 1;
    } else {
      segments.push({ text: words[i] });
      i += 1;
    }
  }
  return segments;
}

/** Renders a transcript line's English text with highlighted words/phrases as
 *  clickable popovers showing part of speech + English/Kurdish meaning. */
function TranscriptLineText({ line, active, dialect, t }: { line: TranscriptLine; active: boolean; dialect: string; t: (key: TranslationKey) => string }) {
  const words = tokenizeWords(line.en);
  const segments = buildSegments(words, line.highlights ?? []);
  return (
    <div dir="ltr" className={cn("text-base flex-1", active && "font-medium")}>
      {segments.map((seg, idx) => (
        <span key={idx}>
          {idx > 0 && " "}
          {seg.highlight ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="underline decoration-dotted decoration-2 underline-offset-4 bg-primary/10 hover:bg-primary/20 rounded px-0.5 font-medium transition"
                >
                  {seg.text}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72" onClick={(e) => e.stopPropagation()}>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold text-base" dir="ltr">{seg.text}</span>
                    <Badge variant="secondary">
                      {(POS_KEYS as readonly string[]).includes(seg.highlight.part_of_speech)
                        ? t(`pos_${seg.highlight.part_of_speech}` as never)
                        : seg.highlight.part_of_speech}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("meaning_english")}</div>
                    <div dir="ltr" className="text-sm">{seg.highlight.meaning_en || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("meaning_kurdish")}</div>
                    <div className="text-sm font-kurdish">
                      {dialect === "sorani"
                        ? (seg.highlight.meaning_ku_sorani || seg.highlight.meaning_ku_badini || "—")
                        : dialect === "badini"
                        ? (seg.highlight.meaning_ku_badini || seg.highlight.meaning_ku_sorani || "—")
                        : (seg.highlight.meaning_ku_sorani || seg.highlight.meaning_ku_badini || "—")}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            seg.text
          )}
        </span>
      ))}
    </div>
  );
}

function VideoView() {
  const { id } = Route.useParams();
  const { t, dialect } = useDialect();
  const fn = useServerFn(getVideo);
  const { data, isLoading } = useQuery({
    queryKey: ["video", id],
    queryFn: () => fn({ data: { id } }),
  });

  const [showTr, setShowTr] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);

  const videoPath = data?.video.video_path as string | null | undefined;

  useEffect(() => {
    if (!videoPath) { setSignedUrl(null); return; }
    let cancel = false;
    supabase.storage.from("videos").createSignedUrl(videoPath, 60 * 60).then(({ data: d }) => {
      if (!cancel && d?.signedUrl) setSignedUrl(d.signedUrl);
    });
    return () => { cancel = true; };
  }, [videoPath]);

  const v = data?.video;
  const transcript: TranscriptLine[] = v && Array.isArray(v.transcript_json) ? (v.transcript_json as unknown as TranscriptLine[]) : [];

  // find active line: last line whose t <= currentTime
  const activeIdx = transcript.reduce((acc, l, i) => ((l.t ?? 0) <= currentTime + 0.05 ? i : acc), -1);

  useEffect(() => {
    if (activeIdx >= 0 && lineRefs.current[activeIdx]) {
      lineRefs.current[activeIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIdx]);

  if (isLoading || !data || !v) return <AppShell><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div></AppShell>;

  const seekTo = (sec: number) => {
    const el = videoRef.current;
    if (el) { el.currentTime = sec; el.play().catch(() => {}); }
  };

  return (
    <AppShell activeLang={v.language_code}>
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-2xl font-bold" dir="ltr">{v.title}</h1>
        {v.description && <p className="text-muted-foreground mt-1 text-sm">{v.description}</p>}
        <div className="mt-5 aspect-video rounded-2xl squircle overflow-hidden shadow-elegant bg-black">
          {videoPath ? (
            signedUrl ? (
              <video
                ref={videoRef}
                className="w-full h-full"
                src={signedUrl}
                controls
                playsInline
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/70"><Loader2 className="h-6 w-6 animate-spin" /></div>
            )
          ) : v.youtube_id ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${v.youtube_id}`}
              title={v.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/70">No video source</div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{t("transcript")}</h2>
          <Button variant="outline" size="sm" onClick={() => setShowTr((s) => !s)}>
            {showTr ? <EyeOff className="ml-2 h-4 w-4" /> : <Eye className="ml-2 h-4 w-4" />}
            {showTr ? t("hide_translation") : t("show_translation")}
          </Button>
        </div>
        {transcript.some((l) => (l.highlights ?? []).length > 0) && (
          <p className="mt-1 text-xs text-muted-foreground">{t("tap_word_hint")}</p>
        )}

        <div className="mt-4 bento-card p-4 space-y-2 max-h-[520px] overflow-y-auto">
          {transcript.length === 0 ? (
            <p className="text-muted-foreground p-4">{t("no_words")}</p>
          ) : (
            transcript.map((line, i) => {
              const active = i === activeIdx;
              return (
                <div
                  key={i}
                  ref={(el) => { lineRefs.current[i] = el; }}
                  onClick={() => videoPath && seekTo(line.t ?? 0)}
                  className={cn(
                    "rounded-lg px-4 py-3 border-r-4 transition cursor-pointer",
                    active
                      ? "bg-primary/15 border-primary-ink shadow-sm"
                      : "border-transparent hover:bg-muted/50",
                    videoPath ? "cursor-pointer" : "cursor-default",
                  )}
                >
                  <div className="flex items-baseline gap-3">
                    {typeof line.t === "number" && (
                      <span className="text-[10px] tabular-nums text-muted-foreground w-10 shrink-0" dir="ltr">
                        {formatTime(line.t)}
                      </span>
                    )}
                    <TranscriptLineText line={line} active={active} dialect={dialect} t={t} />
                  </div>
                  {showTr && (
                    <div className="mt-1 text-sm text-muted-foreground font-kurdish pr-13" style={{ paddingInlineStart: "3.25rem" }}>
                      {dialect === "sorani" ? line.ku_sorani : dialect === "badini" ? line.ku_badini : (line.ku_sorani ?? line.ku_badini)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
