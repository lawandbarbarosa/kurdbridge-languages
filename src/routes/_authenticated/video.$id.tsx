Here is the complete, integrated production code.

To give you the exact YouTube-style experience, this code swaps out the browser's default video controls for a custom UI panel. It includes the **dynamically split progress scrubber bar** (which splits into visual segments using your transcript timestamps), hover tooltips, custom play/pause state handling, and a dedicated layout optimization to prevent UI lag.

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";
import { getVideo } from "@/lib/learn.functions";
import { supabase } from "@/integrations/supabase/client";
import { useDialect } from "@/hooks/use-dialect";
import type { TranslationKey } from "@/i18n/sorani";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Eye, EyeOff, Play, Pause, Volume2, VolumeX } from "lucide-react";
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

interface TranscriptLine { 
  t?: number; 
  en: string; 
  ku_sorani?: string; 
  ku_badini?: string; 
  highlights?: WordHighlight[] 
}

function tokenizeWords(text: string): string[] {
  return (text || "").split(/\s+/).filter(Boolean);
}

const POS_KEYS = ["noun", "verb", "adjective", "adverb", "phrase", "other"] as const;

interface TextSegment { text: string; highlight?: WordHighlight }

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

function TranscriptLineText({ line, active, dialect, t }: { line: TranscriptLine; active: boolean; dialect: string; t: (key: TranslationKey) => string }) {
  const words = tokenizeWords(line.en);
  const segments = buildSegments(words, line.highlights ?? []);
  return (
    <div
      dir="ltr"
      className={cn(
        "text-lg sm:text-2xl lg:text-3xl leading-snug tracking-tight break-words transition-colors",
        active ? "text-foreground font-bold" : "text-muted-foreground font-semibold",
      )}
    >
      {segments.map((seg, idx) => (
        <span key={idx}>
          {idx > 0 && " "}
          {seg.highlight ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="underline decoration-dotted decoration-2 underline-offset-4 hover:opacity-75 rounded transition"
                >
                  {seg.text}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 max-w-[calc(100vw-2rem)]" onClick={(e) => e.stopPropagation()}>
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
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null); 
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);
  const viewportRef = useRef<HTMLDivElement>(null);

  const videoPath = data?.video.video_path as string | null | undefined;
  const v = data?.video;
  const transcript: TranscriptLine[] = v && Array.isArray(v.transcript_json) ? (v.transcript_json as unknown as TranscriptLine[]) : [];

  // 1. Fetch Signed URL safely
  useEffect(() => {
    if (!videoPath) { setSignedUrl(null); return; }
    let isCurrent = true;

    supabase.storage.from("videos").createSignedUrl(videoPath, 3600).then(({ data: d }) => {
      if (isCurrent && d?.signedUrl) setSignedUrl(d.signedUrl);
    });

    return () => { isCurrent = false; };
  }, [videoPath]);

  // 2. Manage Video Duration Fallback dynamically
  useEffect(() => {
    if (transcript.length > 0) {
      const calculatedEnd = (transcript[transcript.length - 1].t ?? 0) + 4;
      setDuration(calculatedEnd);
    }
  }, [transcript]);

  // 3. YouTube Polling Mechanism Fallback
  useEffect(() => {
    if (videoPath || !v?.youtube_id) return;
    
    const interval = setInterval(() => {
      if (ytPlayerRef.current?.getCurrentTime) {
        setCurrentTime(ytPlayerRef.current.getCurrentTime());
      }
    }, 200);

    return () => clearInterval(interval);
  }, [videoPath, v?.youtube_id]);

  // Derive Active Line Highlight Index
  const activeIdx = transcript.reduce((acc, l, i) => ((l.t ?? 0) <= currentTime + 0.05 ? i : acc), -1);

  // 4. Smooth, Optimized Auto-Follow
  useLayoutEffect(() => {
    const idx = activeIdx >= 0 ? activeIdx : 0;
    const viewport = viewportRef.current;
    const activeEl = lineRefs.current[idx];
    if (!viewport || !activeEl) return;

    const recalc = () => {
      const offset = activeEl.offsetTop - viewport.clientHeight / 2 + activeEl.offsetHeight / 2;
      setScrollOffset(Math.max(0, offset));
    };

    recalc();

    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(recalc);
    ro.observe(viewport);
    ro.observe(activeEl);

    return () => ro.disconnect();
  }, [activeIdx]);

  if (isLoading || !data || !v) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AppShell>
    );
  }

  const seekTo = (sec: number) => {
    if (videoPath && videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else if (v.youtube_id && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(sec, true);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <AppShell activeLang={v.language_code}>
      <div className="-mt-8 -mb-8">
        <div className="-mx-4 sm:-mx-6 bg-background">
          
          {/* Main Custom Player Canvas */}
          <div className="relative bg-black overflow-hidden h-[min(75dvh,56.25vw)] flex flex-col justify-between group">
            <div className="w-full h-full flex items-center justify-center grow">
              {videoPath ? (
                signedUrl ? (
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain cursor-pointer"
                    src={signedUrl}
                    playsInline
                    onClick={togglePlay}
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onDurationChange={(e) => setDuration(e.currentTarget.duration || duration)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin text-white/70" />
                )
              ) : v.youtube_id ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${v.youtube_id}?enablejsapi=1`}
                  title={v.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="text-white/70">No video source</div>
              )}
            </div>

            {/* Custom YouTube-Style Segmented Interface Overlay controls */}
            {videoPath && signedUrl && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                
                {/* Segmented Timeline Control Bar */}
                <div className="flex gap-[3px] h-1.5 items-center cursor-pointer mb-3 relative group/timeline">
                  {transcript.map((line, idx) => {
                    const startTime = line.t ?? 0;
                    const nextLine = transcript[idx + 1];
                    const endTime = nextLine ? (nextLine.t ?? startTime) : duration;
                    const segmentDuration = Math.max(0.1, endTime - startTime);
                    
                    const widthPercent = (segmentDuration / duration) * 100;
                    
                    let fillPercent = 0;
                    if (currentTime >= endTime) {
                      fillPercent = 100;
                    } else if (currentTime >= startTime && currentTime < endTime) {
                      fillPercent = ((currentTime - startTime) / segmentDuration) * 100;
                    }

                    return (
                      <div
                        key={idx}
                        style={{ width: `${widthPercent}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          seekTo(startTime);
                        }}
                        className="relative h-1 hover:h-2 bg-white/30 transition-all rounded-sm overflow-visible group/seg"
                      >
                        {/* Red Fill Track progress indicator */}
                        <div 
                          className="h-full bg-red-600 transition-all duration-75 rounded-sm" 
                          style={{ width: `${fillPercent}%` }}
                        />
                        
                        {/* Interactive floating preview panel hover container */}
                        <div className="absolute hidden group-hover/seg:block bottom-5 left-1/2 -translate-x-1/2 bg-neutral-900/95 text-white text-[11px] font-sans tracking-wide px-2.5 py-1.5 rounded border border-white/10 shadow-xl whitespace-nowrap z-50 pointer-events-none">
                          <span className="text-red-400 font-bold mr-1">{formatTime(startTime)}</span> 
                          {line.en.substring(0, 35)}{line.en.length > 35 ? "..." : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Lower Action Hub Panel Dashboard */}
                <div className="flex items-center justify-between text-white text-sm px-1">
                  <div className="flex items-center gap-4">
                    <button onClick={togglePlay} className="hover:text-red-500 transition p-0.5">
                      {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white" />}
                    </button>
                    <button onClick={toggleMute} className="hover:text-red-500 transition p-0.5">
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <span className="text-xs text-neutral-300 font-mono tracking-tighter selection:bg-transparent">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Bottom Transcription Text Column Sections */}
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-12">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground break-words" dir="ltr">
                  {v.title}
                </h1>
                {v.description && <p className="text-muted-foreground mt-1 text-sm break-words">{v.description}</p>}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowTr((s) => !s)} className="shrink-0">
                {showTr ? <EyeOff className="ml-2 h-4 w-4" /> : <Eye className="ml-2 h-4 w-4" />}
                {showTr ? t("hide_translation") : t("show_translation")}
              </Button>
            </div>
            
            {transcript.some((l) => (l.highlights ?? []).length > 0) && (
              <p className="mt-3 text-xs text-muted-foreground">{t("tap_word_hint")}</p>
            )}

            <div
              ref={viewportRef}
              className="relative mt-8 h-[min(64dvh,440px)] sm:h-[min(52dvh,440px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden animate-in fade-in duration-300"
            >
              {transcript.length === 0 ? (
                <p className="text-muted-foreground py-4">{t("no_words")}</p>
              ) : (
                <div
                  className="transition-transform duration-500 ease-out"
                  style={{ transform: `translateY(${-scrollOffset}px)` }}
                >
                  {transcript.map((line, i) => {
                    const active = i === activeIdx;
                    return (
                      <div
                        key={i}
                        ref={(el) => { lineRefs.current[i] = el; }}
                        onClick={() => seekTo(line.t ?? 0)}
                        className="py-3 cursor-pointer"
                      >
                        <TranscriptLineText line={line} active={active} dialect={dialect} t={t} />
                        {showTr && (line.ku_sorani || line.ku_badini) && (
                          <div className={cn("mt-1 text-sm font-kurdish break-words transition-colors", active ? "text-foreground/70" : "text-muted-foreground")}>
                            {dialect === "sorani" ? line.ku_sorani : dialect === "badini" ? line.ku_badini : (line.ku_sorani ?? line.ku_badini)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}

```
