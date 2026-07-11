import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Rewind,
  FastForward,
  Target,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  SkipForward,
  Undo2,
  CheckCircle2,
  ListPlus,
  PlayCircle,
} from "lucide-react";

export interface TranscriptLine {
  t?: number;
  en: string;
  ku_sorani?: string;
  ku_badini?: string;
}

interface VideoTranscriptStudioProps {
  videoPath: string | null;
  localFile: File | null;
  lines: TranscriptLine[];
  onLinesChange: (lines: TranscriptLine[]) => void;
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5];

function fmt(s: number | undefined): string {
  if (s == null || !isFinite(s) || s < 0) return "—:—";
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${m}:${sec.toFixed(1).padStart(4, "0")}`;
}

export function VideoTranscriptStudio({
  videoPath,
  localFile,
  lines,
  onLinesChange,
}: VideoTranscriptStudioProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const alignBoxRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [mode, setMode] = useState<"edit" | "align">("edit");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [alignPointer, setAlignPointer] = useState(0);
  const [justMarked, setJustMarked] = useState<number | null>(null);

  // Resolve a playable preview URL: prefer the freshly-chosen local file (instant,
  // no network round trip) and fall back to a signed URL for an already-uploaded video.
  useEffect(() => {
    if (localFile) {
      const url = URL.createObjectURL(localFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (videoPath) {
      let cancelled = false;
      supabase.storage
        .from("videos")
        .createSignedUrl(videoPath, 60 * 60)
        .then(({ data }) => {
          if (!cancelled && data?.signedUrl) setPreviewUrl(data.signedUrl);
        });
      return () => {
        cancelled = true;
      };
    }
    setPreviewUrl(null);
  }, [localFile, videoPath]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
  }, [rate, previewUrl]);

  useEffect(() => {
    if (mode === "align") {
      const firstUnmarked = lines.findIndex((l) => l.t == null);
      setAlignPointer(firstUnmarked === -1 ? 0 : firstUnmarked);
      alignBoxRef.current?.focus();
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (i: number, patch: Partial<TranscriptLine>) => {
    const next = lines.slice();
    next[i] = { ...next[i], ...patch };
    onLinesChange(next);
  };
  const addLine = () => onLinesChange([...lines, { en: "", ku_sorani: "", ku_badini: "" }]);
  const removeLine = (i: number) => onLinesChange(lines.filter((_, idx) => idx !== i));
  const moveLine = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= lines.length) return;
    const next = lines.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onLinesChange(next);
  };

  const importBulk = () => {
    const imported = bulkText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((en) => ({ en, ku_sorani: "", ku_badini: "" }) as TranscriptLine);
    if (imported.length === 0) return;
    onLinesChange([...lines, ...imported]);
    setBulkText("");
    setBulkOpen(false);
  };

  const onImportFile = async (file: File) => {
    const text = await file.text();
    setBulkText((prev) => (prev ? `${prev}\n${text}` : text));
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  const seekBy = (delta: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(duration || el.duration || 0, el.currentTime + delta));
  };

  const seekTo = (t: number, play = false) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = t;
    if (play) el.play().catch(() => {});
  };

  const markIndex = (i: number) => {
    const el = videoRef.current;
    if (!el) return;
    update(i, { t: Math.max(0, el.currentTime) });
    setJustMarked(i);
    window.setTimeout(() => setJustMarked((cur) => (cur === i ? null : cur)), 500);
  };

  const markCurrentTarget = () => {
    if (alignPointer >= lines.length) return;
    markIndex(alignPointer);
    setAlignPointer((p) => p + 1);
  };
  const skipTarget = () => setAlignPointer((p) => Math.min(p + 1, lines.length));
  const backOne = () => setAlignPointer((p) => Math.max(p - 1, 0));

  const handleAlignKeyDown = (e: React.KeyboardEvent) => {
    if (e.code === "Space") {
      e.preventDefault();
      markCurrentTarget();
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      seekBy(-2);
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      seekBy(2);
    } else if (e.code === "KeyK") {
      e.preventDefault();
      togglePlay();
    }
  };

  const markedCount = useMemo(() => lines.filter((l) => l.t != null).length, [lines]);
  const allMarked = lines.length > 0 && markedCount === lines.length;

  return (
    <div className="grid gap-3">
      {/* Player */}
      <div className="rounded-lg overflow-hidden bg-black aspect-video max-h-[320px]">
        {previewUrl ? (
          <video
            ref={videoRef}
            src={previewUrl}
            controls
            playsInline
            className="w-full h-full"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/50 text-sm text-center px-4">
            Upload a video above to preview and align it here
          </div>
        )}
      </div>
      {previewUrl && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => seekBy(-2)}>
            <Rewind className="h-3.5 w-3.5" /> 2s
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => seekBy(2)}>
            2s <FastForward className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground" dir="ltr">
            {fmt(currentTime)} / {fmt(duration)}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <Label className="text-xs text-muted-foreground">Speed</Label>
            {RATES.map((r) => (
              <Button
                key={r}
                type="button"
                size="sm"
                variant={rate === r ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => setRate(r)}
              >
                {r}x
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex items-center gap-2 mt-1">
        <Button
          type="button"
          size="sm"
          variant={mode === "edit" ? "default" : "outline"}
          onClick={() => setMode("edit")}
        >
          Edit &amp; translate
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "align" ? "default" : "outline"}
          onClick={() => setMode("align")}
        >
          <Target className="h-3.5 w-3.5" /> Align with video
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {markedCount}/{lines.length} timed
        </span>
      </div>

      {mode === "align" ? (
        <div
          ref={alignBoxRef}
          tabIndex={0}
          onKeyDown={handleAlignKeyDown}
          className="rounded-lg border p-4 bg-muted/30 outline-none focus:ring-1 focus:ring-ring grid gap-3"
        >
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add or import transcript lines first (switch to Edit &amp; translate), then come back
              here to time them.
            </p>
          ) : !previewUrl ? (
            <p className="text-sm text-muted-foreground">Upload a video first.</p>
          ) : allMarked ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              All lines are timed. Switch to "Edit &amp; translate" to add Sorani/Badini
              translations or fine-tune timestamps.
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Play the video. The moment you hear the line below spoken, press{" "}
                <kbd className="px-1 rounded border bg-background">Space</kbd> or click Mark — it
                captures the timestamp and moves to the next line.{" "}
                <kbd className="px-1 rounded border bg-background">←</kbd>/
                <kbd className="px-1 rounded border bg-background">→</kbd> rewind/skip 2s,{" "}
                <kbd className="px-1 rounded border bg-background">K</kbd> play/pause.
              </p>
              <div className="rounded-md border bg-background p-4">
                <div className="text-xs text-muted-foreground mb-1">
                  Line {alignPointer + 1} of {lines.length}
                </div>
                <div dir="ltr" className="text-lg font-medium leading-snug">
                  {lines[alignPointer]?.en || (
                    <span className="italic text-muted-foreground">(empty line)</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={backOne}
                  disabled={alignPointer === 0}
                >
                  <Undo2 className="h-3.5 w-3.5" /> Back
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={skipTarget}>
                  <SkipForward className="h-3.5 w-3.5" /> Skip
                </Button>
                <Button type="button" size="sm" onClick={markCurrentTarget} className="ml-auto">
                  <Target className="h-3.5 w-3.5" /> Mark (Space)
                </Button>
              </div>
            </>
          )}

          {lines.length > 0 && (
            <div className="grid gap-1 max-h-56 overflow-y-auto mt-1 border-t pt-2">
              {lines.map((l, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setAlignPointer(i)}
                  className={cn(
                    "flex items-center gap-2 text-left rounded px-2 py-1 text-sm transition",
                    i === alignPointer ? "bg-primary/10 font-medium" : "hover:bg-muted",
                    justMarked === i && "bg-primary/20",
                  )}
                >
                  {l.t != null ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/40" />
                  )}
                  <span
                    className="text-[10px] tabular-nums text-muted-foreground w-14 shrink-0"
                    dir="ltr"
                  >
                    {fmt(l.t)}
                  </span>
                  <span dir="ltr" className="truncate flex-1">
                    {l.en || <em className="text-muted-foreground">(empty)</em>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="rounded-lg border p-3 bg-muted/30 grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Import transcript</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setBulkOpen((s) => !s)}
              >
                <ListPlus className="h-3.5 w-3.5" /> {bulkOpen ? "Hide" : "Paste script"}
              </Button>
            </div>
            {bulkOpen && (
              <div className="grid gap-2">
                <p className="text-xs text-muted-foreground">
                  Paste your script below, one line per row (or upload a .txt file). Each row
                  becomes a transcript line — you'll time and translate them next.
                </p>
                <Textarea
                  rows={6}
                  dir="ltr"
                  placeholder={
                    "Hello, welcome to the lesson.\nToday we'll learn how to introduce yourself.\n..."
                  }
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".txt,text/plain"
                    className="max-w-64 h-8 text-xs"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onImportFile(f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={importBulk}
                    disabled={!bulkText.trim()}
                    className="ml-auto"
                  >
                    Import lines
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label>Transcript lines</Label>
            <Button type="button" size="sm" variant="outline" onClick={addLine}>
              + Add line
            </Button>
          </div>
          {lines.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No lines yet. Paste a script above or click "Add line".
            </p>
          )}
          {lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "rounded-md border p-3 grid gap-2 bg-muted/30",
                justMarked === i && "ring-1 ring-primary",
              )}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Line {i + 1}</span>
                <div className="flex items-center gap-1">
                  <Badge
                    variant={line.t != null ? "default" : "secondary"}
                    className="tabular-nums"
                    dir="ltr"
                  >
                    {fmt(line.t)}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={() => markIndex(i)}
                    disabled={!previewUrl}
                    title="Set to current video time"
                  >
                    <Target className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={() => line.t != null && seekTo(line.t, true)}
                    disabled={!previewUrl || line.t == null}
                    title="Jump to this timestamp"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                  </Button>
                  {line.t != null && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => update(i, { t: undefined })}
                      title="Clear timestamp"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => moveLine(i, -1)}
                    disabled={i === 0}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => moveLine(i, 1)}
                    disabled={i === lines.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-destructive"
                    onClick={() => removeLine(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Input
                placeholder="English line"
                dir="ltr"
                value={line.en}
                onChange={(e) => update(i, { en: e.target.value })}
              />
              <Input
                placeholder="Kurdish (Sorani) translation"
                dir="rtl"
                className="font-kurdish"
                value={line.ku_sorani ?? ""}
                onChange={(e) => update(i, { ku_sorani: e.target.value })}
              />
              <Input
                placeholder="Kurdish (Badini) translation"
                dir="rtl"
                className="font-kurdish"
                value={line.ku_badini ?? ""}
                onChange={(e) => update(i, { ku_badini: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
