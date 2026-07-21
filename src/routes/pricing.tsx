import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialect } from "@/hooks/use-dialect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

function PricingPage() {
  const { t, dialect } = useDialect();
  const dir = dialect === "english" ? "ltr" : "rtl";
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const planFeatures = [
    t("plan_feature_1"),
    t("plan_feature_2"),
    t("plan_feature_3"),
    t("plan_feature_4"),
    t("plan_feature_5"),
    t("plan_feature_6"),
    t("plan_feature_7"),
    t("plan_feature_8"),
  ];

  const faqs = [
    { q: t("pricing_faq_q1"), a: t("pricing_faq_a1") },
    { q: t("pricing_faq_q2"), a: t("pricing_faq_a2") },
    { q: t("pricing_faq_q3"), a: t("pricing_faq_a3") },
  ];

  return (
    <div dir={dir} className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 pt-14 sm:pt-20 pb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm text-primary-ink mb-6">
          {t("pricing_eyebrow")}
        </div>
        <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight text-primary-ink">
          {t("pricing_title")}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          {t("pricing_sub")}
        </p>
      </section>

      {/* Plan card */}
      <section className="mx-auto max-w-lg px-4 sm:px-6 pb-14 sm:pb-20">
        <div className="bento-card p-8 sm:p-10 relative overflow-hidden">
          <Badge variant="success" className="mb-4">
            {t("pricing_badge")}
          </Badge>
          <h2 className="font-display text-2xl font-bold">{t("plan_name")}</h2>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-5xl font-bold text-primary-ink">
              {t("plan_price")}
            </span>
            <span className="text-muted-foreground">{t("plan_period")}</span>
          </div>
          <p className="mt-3 text-muted-foreground leading-relaxed">{t("plan_desc")}</p>

          <ul className="mt-6 space-y-3">
            {planFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="h-5 w-5 text-success-ink shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Button asChild size="lg" className="w-full mt-8 gradient-brand shadow-elegant">
            <Link
              to={authed ? "/dashboard" : "/auth"}
              search={authed ? undefined : { mode: "signup" }}
            >
              {t("plan_cta")}
            </Link>
          </Button>
        </div>
      </section>

      {/* Will it stay free */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-14 sm:pb-20">
        <div className="bento-card p-8 sm:p-10">
          <h2 className="font-display text-xl sm:text-2xl font-bold mb-3">
            {t("pricing_note_title")}
          </h2>
          <p className="text-muted-foreground leading-relaxed">{t("pricing_note_body")}</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-14 sm:pb-20">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-8">
          {t("pricing_faq_title")}
        </h2>
        <Accordion type="single" collapsible className="bento-card px-6 sm:px-8">
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} value={`pfaq-${i}`}>
              <AccordionTrigger className="font-display text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="gradient-brand rounded-3xl squircle p-10 sm:p-16 text-center shadow-elegant">
          <h2 className="font-display text-2xl sm:text-3xl font-bold">{t("pricing_cta_title")}</h2>
          <p className="mt-3 max-w-xl mx-auto leading-relaxed text-black/80">
            {t("pricing_cta_sub")}
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="mt-8 bg-black text-white hover:bg-black/85"
          >
            <Link
              to={authed ? "/dashboard" : "/auth"}
              search={authed ? undefined : { mode: "signup" }}
            >
              {t("plan_cta")}
            </Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
