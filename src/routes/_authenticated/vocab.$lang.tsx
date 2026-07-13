import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { z } from "zod";
import { getDueFlashcards, reviewFlashcard } from "@/lib/learn.functions";
import { useDialect } from "@/hooks/use-dialect";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Volume2, RotateCw } from "lucide-react";

const paramsSchema = z.object({ lang: z.enum(["en", "de", "ar", "ko"]) });

export const Route = createFileRoute("/_authenticated/vocab/$lang")({
  parseParams: (p) => paramsSchema.parse(p),
  component: Vocab,
});

function Vocab() {
  const { lang } = Route.useParams();
  const { t, dialect } = useDialect();
  const qc = useQueryClient();
  const dueFn = useServerFn(getDueFlashcards);
  const reviewFn = useServerFn(reviewFlashcard);

  const { data, isLoading } = useQuery({
    queryKey: ["vocab-due", lang],
    queryFn: () => dueFn({ data: { language: lang, limit: 20 } }),
  });

  const review = useMutation({
    mutationFn: (v: { wordId: string; correct: boolean }) => reviewFn({ data: v }),
    onSuccess: () => { /* silent; local step */ },
  });

  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  const words = useMemo(() => data?.words ?? [], [data]);

  if (isLoading) return <AppShell activeLang={lang}><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div></AppShell>;

  if (words.length === 0 || done) {
    return (
      <AppShell activeLang={lang}>
        <div className="max-w-md mx-auto text-center py-16">
          <div className="h-20 w-20 mx-auto rounded-full gradient-brand grid place-items-center">
            <Check className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold">{words.length === 0 ? t("no_due") : t("completed")}</h1>
          <Button asChild className="mt-8"><a href="/dashboard">{t("go_to_dashboard")}</a></Button>
        </div>
      </AppShell>
    );
  }

  const current = words[idx];
  const w = current.word;
  const kurdish = dialect === "sorani" ? w.kurdish_sorani : w.kurdish_badini;
  const example = w.example_sentence;
  const exampleTr = dialect === "sorani" ? w.example_sorani : w.example_badini;

  async function answer(correct: boolean) {
    await review.mutateAsync({ wordId: w.id, correct });
    if (idx + 1 >= words.length) {
      setDone(true);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } else {
      setIdx((i) => i + 1);
      setRevealed(false);
    }
  }

  function playAudio() {
    if (typeof window === "undefined") return;
    const utter = new SpeechSynthesisUtterance(w.word);
    utter.lang = ({ en: "en-US", de: "de-DE", ar: "ar-SA", ko: "ko-KR" } as const)[lang as "en" | "de" | "ar" | "ko"];
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  return (
    <AppShell activeLang={lang}>
      <div className="max-w-lg mx-auto py-6">
        <div className="mb-4 flex justify-between text-sm text-muted-foreground">
          <span>{idx + 1} {t("of")} {words.length}</span>
          <span>{t("flashcards")}</span>
        </div>
        <div className="bento-card p-10 text-center min-h-[380px] flex flex-col justify-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="text-5xl font-display font-bold" dir="ltr">{w.word}</div>
            <button onClick={playAudio} className="p-2 rounded-full hover:bg-accent" title={t("play_audio")}>
              <Volume2 className="h-5 w-5 text-primary-ink" />
            </button>
          </div>
          {revealed ? (
            <>
              <div className="mt-4 text-3xl font-kurdish">{kurdish}</div>
              {example && (
                <div className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
                  <div className="text-xs uppercase tracking-wider mb-2">{t("example")}</div>
                  <div dir="ltr" className="text-base text-foreground">{example}</div>
                  {exampleTr && <div className="mt-2 font-kurdish">{exampleTr}</div>}
                </div>
              )}
            </>
          ) : (
            <Button variant="outline" size="lg" onClick={() => setRevealed(true)} className="mx-auto">
              {t("show_answer")}
            </Button>
          )}
        </div>

        {revealed && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button size="lg" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/5" onClick={() => answer(false)} disabled={review.isPending}>
              <X className="ml-2 h-4 w-4" />
              {t("didnt_know")}
            </Button>
            <Button size="lg" className="gradient-brand" onClick={() => answer(true)} disabled={review.isPending}>
              <Check className="ml-2 h-4 w-4" />
              {t("i_knew_it")}
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
