import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getLessonTree } from "@/lib/learn.functions";
import { useDialect } from "@/hooks/use-dialect";
import { AppShell } from "@/components/app-shell";
import { Loader2, Lock, CheckCircle2, PlayCircle } from "lucide-react";

const paramsSchema = z.object({ lang: z.enum(["en", "de", "ar", "ko"]) });

export const Route = createFileRoute("/_authenticated/learn/$lang")({
  parseParams: (p) => paramsSchema.parse(p),
  component: Learn,
});

function Learn() {
  const { lang } = Route.useParams();
  const { t, dialect } = useDialect();
  const treeFn = useServerFn(getLessonTree);
  const { data, isLoading } = useQuery({
    queryKey: ["tree", lang],
    queryFn: () => treeFn({ data: { language: lang } }),
  });

  if (isLoading) return <AppShell activeLang={lang}><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div></AppShell>;

  return (
    <AppShell activeLang={lang}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-baseline justify-between mb-8">
          <h1 className="font-display text-3xl font-bold">{t("lesson_tree")}</h1>
          <div className="text-sm text-muted-foreground">{t("current_level")}: <span className="font-bold text-primary">{data?.currentCefr}</span></div>
        </div>

        <div className="space-y-10">
          {(data?.tree ?? []).map((lvl) => (
            <div key={lvl.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-12 w-12 rounded-2xl grid place-items-center font-display text-xl font-bold ${
                  lvl.unlocked ? "gradient-emerald text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {lvl.cefr}
                </div>
                <h2 className="font-display text-xl font-semibold">
                  {t("level")} {lvl.cefr}
                </h2>
              </div>
              {lvl.lessons.length === 0 ? (
                <div className="text-sm text-muted-foreground italic pr-16">{t("no_words")}</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3 pr-16">
                  {lvl.lessons.map((l) => (
                    <LessonNode key={l.id} lesson={l} dialect={dialect} disabled={!l.unlocked} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function LessonNode({ lesson, dialect, disabled }: {
  lesson: { id: string; title_sorani: string; title_badini: string; summary_sorani: string | null; summary_badini: string | null; passed: boolean; unlocked: boolean; score: number };
  dialect: "sorani" | "badini";
  disabled: boolean;
}) {
  const title = dialect === "sorani" ? lesson.title_sorani : lesson.title_badini;
  const summary = dialect === "sorani" ? lesson.summary_sorani : lesson.summary_badini;

  const inner = (
    <div className={`bento-card p-5 flex items-start gap-4 ${disabled ? "opacity-50" : "hover:scale-[1.01] transition-transform"}`}>
      <div className={`h-11 w-11 rounded-xl grid place-items-center shrink-0 ${
        lesson.passed ? "bg-success/15 text-success" :
        lesson.unlocked ? "bg-gold/15 text-gold" :
        "bg-muted text-muted-foreground"
      }`}>
        {lesson.passed ? <CheckCircle2 className="h-5 w-5" /> :
         lesson.unlocked ? <PlayCircle className="h-5 w-5" /> :
         <Lock className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold">{title}</div>
        {summary && <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{summary}</div>}
        {lesson.passed && <div className="text-xs text-success mt-2">{lesson.score}%</div>}
      </div>
    </div>
  );

  return disabled ? inner : <Link to={`/lesson/${lesson.id}`}>{inner}</Link>;
}
