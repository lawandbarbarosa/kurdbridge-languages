import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Route as RouteIcon, Languages, Unlock } from "lucide-react";
import { useDialect } from "@/hooks/use-dialect";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  const { t, dialect } = useDialect();
  const dir = dialect === "english" ? "ltr" : "rtl";

  const values = [
    {
      icon: <Heart className="h-6 w-6" />,
      title: t("about_value1_title"),
      desc: t("about_value1_desc"),
    },
    {
      icon: <RouteIcon className="h-6 w-6" />,
      title: t("about_value2_title"),
      desc: t("about_value2_desc"),
    },
    {
      icon: <Languages className="h-6 w-6" />,
      title: t("about_value3_title"),
      desc: t("about_value3_desc"),
    },
    {
      icon: <Unlock className="h-6 w-6" />,
      title: t("about_value4_title"),
      desc: t("about_value4_desc"),
    },
  ];

  return (
    <div dir={dir} className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 pt-14 sm:pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm text-primary-ink mb-6">
          {t("about_eyebrow")}
        </div>
        <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight text-primary-ink">
          {t("about_title")}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t("about_sub")}
        </p>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 pb-14 sm:pb-20">
        <div className="bento-card p-8 sm:p-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
            {t("about_mission_title")}
          </h2>
          <p className="text-muted-foreground leading-relaxed text-lg">{t("about_mission_body")}</p>
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 pb-14 sm:pb-20">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
          {t("about_story_title")}
        </h2>
        <p className="text-muted-foreground leading-relaxed text-lg">{t("about_story_body")}</p>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-14 sm:pb-20">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-10">
          {t("about_values_title")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {values.map((v) => (
            <div key={v.title} className="bento-card p-6 sm:p-8 flex gap-4">
              <div className="h-12 w-12 shrink-0 rounded-xl squircle bg-gold/15 text-primary-ink grid place-items-center">
                {v.icon}
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold mb-1">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="gradient-brand rounded-3xl squircle p-10 sm:p-16 text-center shadow-elegant">
          <h2 className="font-display text-2xl sm:text-3xl font-bold">{t("about_cta_title")}</h2>
          <p className="mt-3 max-w-xl mx-auto leading-relaxed text-black/80">
            {t("about_cta_sub")}
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="mt-8 bg-black text-white hover:bg-black/85"
          >
            <Link to="/contact">{t("about_cta_button")}</Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
