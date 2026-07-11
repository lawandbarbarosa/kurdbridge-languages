import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { getVideo } from "@/lib/learn.functions";
import { useDialect } from "@/hooks/use-dialect";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";

const paramsSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/_authenticated/video/$id")({
  parseParams: (p) => paramsSchema.parse(p),
  component: VideoView,
});

interface TranscriptLine { t?: number; en: string; ku_sorani?: string; ku_badini?: string }

function VideoView() {
  const { id } = Route.useParams();
  const { t, dialect } = useDialect();
  const fn = useServerFn(getVideo);
  const { data, isLoading } = useQuery({
    queryKey: ["video", id],
    queryFn: () => fn({ data: { id } }),
  });

  const [showTr, setShowTr] = useState(true);

  if (isLoading || !data) return <AppShell><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div></AppShell>;
  const v = data.video;
  const transcript: TranscriptLine[] = Array.isArray(v.transcript_json) ? (v.transcript_json as unknown as TranscriptLine[]) : [];

  return (
    <AppShell activeLang={v.language_code}>
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-2xl font-bold" dir="ltr">{v.title}</h1>
        {v.description && <p className="text-muted-foreground mt-1 text-sm">{v.description}</p>}
        <div className="mt-5 aspect-video rounded-2xl overflow-hidden shadow-elegant">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${v.youtube_id}`}
            title={v.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{t("transcript")}</h2>
          <Button variant="outline" size="sm" onClick={() => setShowTr((s) => !s)}>
            {showTr ? <EyeOff className="ml-2 h-4 w-4" /> : <Eye className="ml-2 h-4 w-4" />}
            {showTr ? t("hide_translation") : t("show_translation")}
          </Button>
        </div>

        <div className="mt-4 bento-card p-6 space-y-4">
          {transcript.length === 0 ? (
            <p className="text-muted-foreground">{t("no_words")}</p>
          ) : (
            transcript.map((line, i) => (
              <div key={i} className="border-r-4 border-primary/30 pr-4">
                <div dir="ltr" className="text-base">{line.text}</div>
                {showTr && (
                  <div className="mt-1 text-sm text-muted-foreground font-kurdish">
                    {dialect === "sorani" ? line.sorani : line.badini}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
