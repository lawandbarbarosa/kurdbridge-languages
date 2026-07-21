import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Clock, Copy, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { useDialect } from "@/hooks/use-dialect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, CONTACT_EMAIL } from "@/components/site-footer";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  const { t, dialect } = useDialect();
  const dir = dialect === "english" ? "ltr" : "rtl";
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  async function onCopyEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      toast.success(t("contact_email_copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(CONTACT_EMAIL);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = [
      name && `${t("contact_form_name")}: ${name}`,
      email && `${t("contact_form_email")}: ${email}`,
      "",
      message,
    ]
      .filter(Boolean)
      .join("\n");
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject || t("contact_form_title"))}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }

  return (
    <div dir={dir} className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 pt-14 sm:pt-20 pb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm text-primary-ink mb-6">
          {t("contact_eyebrow")}
        </div>
        <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight text-primary-ink">
          {t("contact_title")}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          {t("contact_sub")}
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: direct contact info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bento-card p-6 sm:p-8">
              <div className="h-12 w-12 rounded-xl squircle bg-gold/15 text-primary-ink grid place-items-center mb-4">
                <Mail className="h-6 w-6" />
              </div>
              <h2 className="font-display text-lg font-semibold mb-1">
                {t("contact_email_label")}
              </h2>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                dir="ltr"
                className="text-primary-ink font-medium hover:underline break-all"
              >
                {CONTACT_EMAIL}
              </a>
              <Button variant="outline" size="sm" className="mt-4 w-full" onClick={onCopyEmail}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {t("contact_copy_email")}
              </Button>
            </div>

            <div className="bento-card p-6 sm:p-8">
              <div className="h-12 w-12 rounded-xl squircle bg-accent/20 text-accent-ink grid place-items-center mb-4">
                <Clock className="h-6 w-6" />
              </div>
              <h2 className="font-display text-lg font-semibold mb-1">
                {t("contact_response_title")}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("contact_response_body")}
              </p>
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-3">
            <div className="bento-card p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold mb-1">{t("contact_form_title")}</h2>
              <p className="text-sm text-muted-foreground mb-6">{t("contact_form_note")}</p>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name">{t("contact_form_name")}</Label>
                    <Input
                      id="contact-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-email">{t("contact_form_email")}</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={255}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-subject">{t("contact_form_subject")}</Label>
                  <Input
                    id="contact-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={150}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-message">{t("contact_form_message")}</Label>
                  <Textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    maxLength={4000}
                    required
                  />
                </div>
                <Button type="submit" size="lg" className="w-full gradient-brand shadow-elegant">
                  <Send className="h-4 w-4 ml-2" />
                  {t("contact_form_send")}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
