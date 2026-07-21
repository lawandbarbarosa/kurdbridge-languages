import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { getLesson, submitLessonQuiz } from "@/lib/learn.functions";
import { useDialect } from "@/hooks/use-dialect";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, ArrowLeft, RotateCw } from "lucide-react";

const paramsSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/_authenticated/lesson/$id")({
  parseParams: (p) => paramsSchema.parse(p),
  component: LessonRunner,
});

type Step = "intro" | "exercises" | "result";

function LessonRunner() {
  const { id } = Route.useParams();
  const { t, dialect } = useDialect();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchFn = useServerFn(getLesson);
  const submitFn = useServerFn(submitLessonQuiz);

  const { data, isLoading } = useQuery({
    queryKey: ["lesson", id],
    queryFn: () => fetchFn({ data: { lessonId: id } }),
  });

  const [step, setStep] = useState<Step>("intro");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean; correct: number; total: number } | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          lessonId: id,
          answers: Object.entries(answers).map(([exerciseId, answer]) => ({ exerciseId, answer })),
        },
      }),
    onSuccess: (r) => {
      setResult(r);
      setStep("result");
      qc.invalidateQueries();
    },
  });

  if (isLoading || !data) {
    return <AppShell><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div></AppShell>;
  }

  const lesson = data.lesson;
  const exercises = data.exercises;
  const title = dialect === "badini"
    ? lesson.title_badini
    : dialect === "english"
    ? (lesson.title_en ?? lesson.title_sorani)
    : lesson.title_sorani;
  const grammar = dialect === "badini"
    ? lesson.grammar_md_badini
    : dialect === "english"
    ? (lesson.grammar_md_en ?? lesson.grammar_md_sorani)
    : lesson.grammar_md_sorani;
  const langCode: string = (lesson as unknown as { levels?: { language_code?: string } }).levels?.language_code ?? "en";

  if (step === "intro") {
    return (
      <AppShell activeLang={langCode}>
        <div className="max-w-3xl mx-auto py-6">
          <button onClick={() => navigate({ to: `/course/${lesson.course_id}` })} className="text-sm text-muted-foreground hover:text-foreground mb-4">← {t("back_to_course")}</button>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">{title}</h1>
          <div className="mt-8 bento-card p-5 sm:p-8 whitespace-pre-wrap leading-loose">
            {grammar}
          </div>
          {Array.isArray(lesson.dialogue_json) && lesson.dialogue_json.length > 0 && (
            <div className="mt-6 bento-card p-4 sm:p-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{t("dialogue")}</div>
              <div className="space-y-3">
                {(lesson.dialogue_json as Array<{ speaker: string; text: string; translation_sorani?: string; translation_badini?: string }>).map((line, i) => (
                  <div key={i} className="border-r-4 border-primary/40 pr-4">
                    <div className="font-medium" dir="ltr"><span className="text-muted-foreground">{line.speaker}:</span> {line.text}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {dialect === "badini" ? line.translation_badini : line.translation_sorani}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-8 flex justify-end">
            <Button size="lg" className="gradient-brand" onClick={() => setStep("exercises")} disabled={exercises.length === 0}>
              <ArrowLeft className="ml-2 h-4 w-4" />
              {t("exercises")} ({exercises.length})
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (step === "exercises") {
    const ex = exercises[idx];
    const prompt = ex.prompt_json as { prompt: string; choices?: string[]; hint_sorani?: string; hint_badini?: string };
    const answered = !!answers[ex.id];
    const isLast = idx === exercises.length - 1;
    return (
      <AppShell activeLang={langCode}>
        <div className="max-w-2xl mx-auto py-6">
          <div className="mb-6">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>{t("question")} {idx + 1} {t("of")} {exercises.length}</span>
              <span className="font-mono uppercase">{ex.type}</span>
            </div>
            <Progress value={((idx + 1) / exercises.length) * 100} />
          </div>

          <div className="bento-card p-5 sm:p-8">
            <h2 className="font-display text-2xl font-semibold" dir="ltr">{prompt.prompt}</h2>
            {(dialect === "badini" ? prompt.hint_badini : prompt.hint_sorani) && (
              <p className="mt-2 text-sm text-muted-foreground">
                {dialect === "badini" ? prompt.hint_badini : prompt.hint_sorani}
              </p>
            )}
            <div className="mt-6 space-y-3">
              {prompt.choices ? (
                prompt.choices.map((choice) => (
                  <button
                    key={choice}
                    dir="ltr"
                    onClick={() => setAnswers((a) => ({ ...a, [ex.id]: choice }))}
                    className={`w-full text-left p-4 rounded-xl squircle border-2 transition-all ${
                      answers[ex.id] === choice ? "border-primary-ink bg-primary/10" : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    {choice}
                  </button>
                ))
              ) : (
                <input
                  dir="ltr"
                  value={answers[ex.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [ex.id]: e.target.value }))}
                  className="w-full p-4 rounded-xl squircle border-2 border-border focus:border-primary-ink outline-none bg-card"
                  placeholder="..."
                />
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
              {t("back")}
            </Button>
            {isLast ? (
              <Button onClick={() => submit.mutate()} disabled={!answered || submit.isPending} className="gradient-brand">
                {submit.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                {t("submit")}
              </Button>
            ) : (
              <Button onClick={() => setIdx((i) => i + 1)} disabled={!answered} className="gradient-brand">
                {t("next")}
              </Button>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  // result
  return (
    <AppShell activeLang={langCode}>
      <div className="max-w-md mx-auto text-center py-16">
        <div className={`h-24 w-24 mx-auto rounded-full grid place-items-center shadow-elegant ${result?.passed ? "gradient-brand" : "bg-destructive/15"}`}>
          {result?.passed ? <CheckCircle2 className="h-12 w-12 text-primary-foreground" /> : <XCircle className="h-12 w-12 text-destructive" />}
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">
          {result?.passed ? t("lesson_passed") : t("lesson_failed")}
        </h1>
        <div className="mt-4 text-6xl font-display font-bold text-primary-ink">{result?.score}%</div>
        <p className="mt-2 text-muted-foreground">{result?.correct} / {result?.total}</p>
        {!result?.passed && <p className="mt-2 text-sm text-muted-foreground">{t("pass_threshold")}</p>}

        <div className="mt-8 flex justify-center gap-3">
          {result?.passed ? (
            <Button asChild size="lg" className="gradient-brand"><a href={`/course/${lesson.course_id}`}><ArrowLeft className="ml-2 h-4 w-4" />{t("continue")}</a></Button>
          ) : (
            <Button size="lg" onClick={() => { setStep("intro"); setIdx(0); setAnswers({}); setResult(null); }} className="gradient-brand">
              <RotateCw className="ml-2 h-4 w-4" />
              {t("retry")}
            </Button>
          )}
          <Button asChild variant="outline" size="lg"><a href="/dashboard">{t("dashboard")}</a></Button>
        </div>
      </div>
    </AppShell>
  );
}
