import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getDashboard } from "@/lib/learn.functions";
import { useDialect } from "@/hooks/use-dialect";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Loader2, Flame, Trophy, BookOpen, PlayCircle, Target, Sparkles, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { t, dialect } = useDialect();
  const navigate = useNavigate();
  const dash = useServerFn(getDashboard);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dash({ data: {} }),
  });

  useEffect(() => {
    if (!isLoading && data && !data.activeLang) {
      navigate({ to: "/onboarding" });
    }
  }, [data, isLoading, navigate]);

  if (isLoading || !data) {
    return <AppShell><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;
  }

  const lang = (data.languages ?? []).find((l) => l.code === data.activeLang);
  const langLabel = lang ? (dialect === "sorani" ? lang.name_sorani : lang.name_badini) : "";
  const displayName = data.profile?.display_name ?? "";

  return (
    <AppShell activeLang={data.activeLang ?? undefined}>
      {/* Header row */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{t("welcome_back")} 👋</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">{displayName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {(data.languages ?? []).map((l) => (
            <Link
              key={l.code}
              to="/dashboard"
              search={{ language: l.code as never }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                l.code === data.activeLang
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-card hover:bg-accent"
              }`}
              onClick={(e) => { e.preventDefault(); /* nav is per-language switch, handled by mutation elsewhere */ }}
              title={l.name_en}
            >
              <span className="mr-1">{l.flag_emoji}</span>
              {dialect === "sorani" ? l.name_sorani : l.name_badini}
            </Link>
          ))}
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-[minmax(120px,auto)]">
        {/* Big continue card */}
        <div className="md:col-span-4 md:row-span-2 bento-card p-8 relative overflow-hidden">
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> {t("continue_learning")}
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              {data.recentLesson
                ? (dialect === "sorani" ? data.recentLesson.title_sorani : data.recentLesson.title_badini)
                : `${langLabel} • ${data.level?.current_cefr ?? "A1"}`}
            </h2>
            <p className="mt-3 text-muted-foreground max-w-md">
              {data.recentLesson ? t("continue_lesson") : t("hero_sub")}
            </p>
            <div className="mt-6 flex gap-3">
              {data.recentLesson ? (
                <Button asChild size="lg" className="gradient-emerald shadow-elegant">
                  <Link to={`/lesson/${data.recentLesson.id}`}>
                    <ArrowLeft className="ml-2 h-4 w-4" />
                    {t("continue")}
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="gradient-emerald shadow-elegant">
                  <Link to={`/learn/${data.activeLang}`}>
                    <ArrowLeft className="ml-2 h-4 w-4" />
                    {t("start")}
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="lg">
                <Link to={`/learn/${data.activeLang}`}>{t("lesson_tree")}</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="md:col-span-2 bento-card p-6 gradient-gold">
          <Flame className="h-6 w-6" />
          <div className="mt-3 text-4xl font-display font-bold">{data.profile?.streak_count ?? 0}</div>
          <div className="text-sm mt-1 opacity-80">{t("streak")} • {t("days")}</div>
        </div>

        {/* Level badge */}
        <div className="md:col-span-2 bento-card p-6">
          <Trophy className="h-6 w-6 text-gold" />
          <div className="mt-3 text-4xl font-display font-bold text-primary">
            {data.level?.current_cefr ?? "A1"}
          </div>
          <div className="text-sm mt-1 text-muted-foreground">{t("current_level")} • {langLabel}</div>
        </div>

        {/* Words learned */}
        <div className="md:col-span-2 bento-card p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("words_learned")}</div>
          <div className="mt-2 text-3xl font-display font-bold">{data.wordsLearnedCount}</div>
        </div>

        {/* Lessons completed */}
        <div className="md:col-span-2 bento-card p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("lessons_completed")}</div>
          <div className="mt-2 text-3xl font-display font-bold">{data.completedCount}</div>
        </div>

        {/* Due for review */}
        <div className="md:col-span-2 bento-card p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("due_for_review")}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-display font-bold">{data.dueCount}</div>
            <div className="text-sm text-muted-foreground">{t("vocabulary")}</div>
          </div>
        </div>

        {/* Vocab quick access */}
        <Link to={`/vocab/${data.activeLang}`} className="md:col-span-3 bento-card p-6 flex items-start justify-between hover:bg-accent/40 transition-colors">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("vocabulary")}</div>
            <div className="mt-1 font-display text-xl font-semibold">{t("flashcards")}</div>
          </div>
          <BookOpen className="h-8 w-8 text-primary" />
        </Link>

        {/* Videos quick access */}
        <Link to={`/videos/${data.activeLang}`} className="md:col-span-3 bento-card p-6 flex items-start justify-between hover:bg-accent/40 transition-colors">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("videos")}</div>
            <div className="mt-1 font-display text-xl font-semibold">{t("video_practice")}</div>
          </div>
          <PlayCircle className="h-8 w-8 text-primary" />
        </Link>
      </div>
    </AppShell>
  );
}
