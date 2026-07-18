import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDialect } from "@/hooks/use-dialect";
import { Button } from "@/components/ui/button";
import { BookOpen, Target, PlayCircle, Sparkles, ArrowLeft } from "lucide-react";
import { DialectToggle } from "@/components/dialect-toggle";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { t, dialect } = useDialect();
  const dir = dialect === "english" ? "ltr" : "rtl";
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div dir={dir} className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-border/60 backdrop-blur-sm bg-background/70 sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/logo.png" alt={t("app_name")} className="h-9 w-9 rounded-xl squircle object-cover shadow-soft" />
            <span className="font-display text-xl font-semibold tracking-tight">{t("app_name")}</span>
          </Link>
          <div className="flex items-center gap-3">
            <DialectToggle />
            {authed ? (
              <Button asChild size="sm">
                <Link to="/dashboard">{t("dashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth" search={{ mode: "signin" }}>{t("sign_in")}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth" search={{ mode: "signup" }}>{t("sign_up")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm text-primary-ink mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t("tagline")}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight text-primary-ink">
            {t("hero_title")}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("hero_sub")}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="gradient-brand shadow-elegant">
              <Link to={authed ? "/dashboard" : "/auth"} search={authed ? undefined : { mode: "signup" }}>
                <ArrowLeft className="ml-2 h-4 w-4" />
                {t("hero_cta")}
              </Link>
            </Button>
          </div>

          <div className="mt-14 flex justify-center gap-4 text-6xl">
            <span>🇬🇧</span><span>🇩🇪</span><span>🇸🇦</span><span>🇰🇷</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          <Feature icon={<Target className="h-6 w-6" />} title={t("feature_placement_title")} desc={t("feature_placement_desc")} />
          <Feature icon={<BookOpen className="h-6 w-6" />} title={t("feature_tree_title")} desc={t("feature_tree_desc")} />
          <Feature icon={<PlayCircle className="h-6 w-6" />} title={t("feature_video_title")} desc={t("feature_video_desc")} />
        </div>
      </section>

      <footer className="border-t border-border/60 mt-10">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {t("app_name")}
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bento-card p-8">
      <div className="h-12 w-12 rounded-xl squircle bg-gold/15 text-primary-ink grid place-items-center mb-5">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
