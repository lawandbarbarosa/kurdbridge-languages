import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getVideos } from "@/lib/learn.functions";
import { useDialect } from "@/hooks/use-dialect";
import { AppShell } from "@/components/app-shell";
import { Loader2, PlayCircle } from "lucide-react";

const paramsSchema = z.object({ lang: z.enum(["en", "de", "ar", "ko"]) });

export const Route = createFileRoute("/_authenticated/videos/$lang")({
  parseParams: (p) => paramsSchema.parse(p),
  component: Videos,
});

function Videos() {
  const { lang } = Route.useParams();
  const { t } = useDialect();
  const fn = useServerFn(getVideos);
  const { data, isLoading } = useQuery({
    queryKey: ["videos", lang],
    queryFn: () => fn({ data: { language: lang } }),
  });

  if (isLoading) return <AppShell activeLang={lang}><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div></AppShell>;

  return (
    <AppShell activeLang={lang}>
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-3xl font-bold mb-8">{t("video_practice")}</h1>
        {(data?.videos ?? []).length === 0 ? (
          <p className="text-muted-foreground">{t("no_words")}</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(data?.videos ?? []).map((v) => (
              <Link key={v.id} to={`/video/${v.id}`} className="bento-card overflow-hidden hover:scale-[1.02] transition-transform">
                <div className="relative aspect-video bg-muted">
                  <img
                    src={`https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`}
                    alt={v.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 grid place-items-center bg-black/20">
                    <PlayCircle className="h-12 w-12 text-white drop-shadow-lg" />
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-background/90 text-xs font-bold">{v.level_cefr}</div>
                </div>
                <div className="p-4">
                  <div className="font-display font-semibold line-clamp-2" dir="ltr">{v.title}</div>
                  {v.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.description}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
