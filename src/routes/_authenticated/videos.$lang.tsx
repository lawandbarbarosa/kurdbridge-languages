import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getVideos } from "@/lib/learn.functions";
import { supabase } from "@/integrations/supabase/client";
import { useDialect } from "@/hooks/use-dialect";
import { AppShell } from "@/components/app-shell";
import { Loader2, PlayCircle } from "lucide-react";

const paramsSchema = z.object({ lang: z.enum(["en", "de", "ar", "ko"]) });

function getVideoThumbnail(bannerPath: string | null | undefined, youtubeId: string | null | undefined): string | null {
  if (bannerPath) {
    return supabase.storage.from("video-banners").getPublicUrl(bannerPath).data.publicUrl;
  }
  if (youtubeId) {
    return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  }
  return null;
}

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {(data?.videos ?? []).map((v) => {
              const thumbnail = getVideoThumbnail(v.banner_path, v.youtube_id);
              return (
              <Link key={v.id} to={`/video/${v.id}`} className="bento-card overflow-hidden group hover:scale-[1.02] transition-transform">
                <div className="relative aspect-[2/3] bg-muted">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={v.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center">
                      <PlayCircle className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors grid place-items-center">
                    <PlayCircle className="h-12 w-12 text-white drop-shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-background/90 text-xs font-bold">{v.level_cefr}</div>
                </div>
                <div className="p-4">
                  <div className="font-display font-semibold line-clamp-2" dir="ltr">{v.title}</div>
                  {v.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.description}</div>}
                </div>
              </Link>
            );})}
          </div>
        )}
      </div>
    </AppShell>
  );
}
