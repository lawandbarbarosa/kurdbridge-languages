import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCourses } from "@/lib/learn.functions";
import { useDialect } from "@/hooks/use-dialect";
import { AppShell } from "@/components/app-shell";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";

const paramsSchema = z.object({ lang: z.enum(["en", "de", "ar", "ko"]) });

export const Route = createFileRoute("/_authenticated/learn/$lang")({
  parseParams: (p) => paramsSchema.parse(p),
  component: Learn,
});

interface CourseCard {
  id: string;
  title_sorani: string;
  title_badini: string;
  title_en: string | null;
  description_sorani: string | null;
  description_badini: string | null;
  description_en: string | null;
  totalLessons: number;
  completedLessons: number;
}

function Learn() {
  const { lang } = Route.useParams();
  const { t, dialect } = useDialect();
  const fn = useServerFn(getCourses);
  const { data, isLoading } = useQuery({
    queryKey: ["courses", lang],
    queryFn: () => fn({ data: { language: lang } }),
  });

  if (isLoading) return <AppShell activeLang={lang}><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div></AppShell>;

  return (
    <AppShell activeLang={lang}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-8">
          <h1 className="font-display text-3xl font-bold">{t("courses")}</h1>
          <div className="text-sm text-muted-foreground">{t("current_level")}: <span className="font-bold text-primary-ink">{data?.currentCefr}</span></div>
        </div>

        <div className="space-y-10">
          {(data?.levels ?? []).map((lvl) => (
            <div key={lvl.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-12 w-12 rounded-2xl squircle grid place-items-center font-display text-xl font-bold ${
                  lvl.unlocked ? "gradient-brand text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {lvl.cefr}
                </div>
                <h2 className="font-display text-xl font-semibold">
                  {t("level")} {lvl.cefr}
                </h2>
              </div>
              {lvl.courses.length === 0 ? (
                <div className="text-sm text-muted-foreground italic sm:pr-16">{t("no_courses")}</div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3 sm:pr-16">
                  {lvl.courses.map((c) => (
                    <CourseCardItem key={c.id} course={c} cefr={lvl.cefr} dialect={dialect} t={t} disabled={!lvl.unlocked} />
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

function CourseCardItem({ course, cefr, dialect, t, disabled }: {
  course: CourseCard;
  cefr: string;
  dialect: "sorani" | "badini" | "english";
  t: (key: never) => string;
  disabled: boolean;
}) {
  const title = dialect === "badini"
    ? course.title_badini
    : dialect === "english"
    ? (course.title_en ?? course.title_sorani)
    : course.title_sorani;
  const description = dialect === "badini"
    ? course.description_badini
    : dialect === "english"
    ? (course.description_en ?? course.description_sorani)
    : course.description_sorani;
  const complete = course.totalLessons > 0 && course.completedLessons === course.totalLessons;

  const inner = (
    <div className={`bento-card p-5 flex items-start gap-4 ${disabled ? "opacity-50" : "hover:scale-[1.01] transition-transform"}`}>
      <div className={`h-11 w-11 rounded-xl squircle grid place-items-center shrink-0 ${
        complete ? "bg-success/15 text-success-ink" :
        disabled ? "bg-muted text-muted-foreground" :
        "bg-gold/15 text-gold-ink"
      }`}>
        {complete ? <CheckCircle2 className="h-5 w-5" /> :
         disabled ? <Lock className="h-5 w-5" /> :
         <span className="font-display text-xs font-bold">{cefr}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold">{title}</div>
        {description && <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{description}</div>}
        <div className="text-xs text-muted-foreground mt-2">
          {course.completedLessons}/{course.totalLessons} {t("lessons" as never)}
        </div>
      </div>
    </div>
  );

  return disabled ? inner : <Link to={`/course/${course.id}`}>{inner}</Link>;
}
