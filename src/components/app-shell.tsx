import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDialect } from "@/hooks/use-dialect";
import { DialectToggle } from "@/components/dialect-toggle";
import { Button } from "@/components/ui/button";
import { Sparkles, LayoutDashboard, BookOpen, PlayCircle, Settings, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  children: React.ReactNode;
  activeLang?: string | null;
}

export function AppShell({ children, activeLang }: Props) {
  const { t, dialect } = useDialect();
  const dir = dialect === "english" ? "ltr" : "rtl";
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function onSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("چوویتەدەرەوە");
    router.navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  const nav = [
    { to: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    ...(activeLang
      ? [
          { to: `/learn/${activeLang}`, label: t("lessons"), icon: BookOpen },
          { to: `/vocab/${activeLang}`, label: t("vocabulary"), icon: Sparkles },
          { to: `/videos/${activeLang}`, label: t("videos"), icon: PlayCircle },
        ]
      : []),
  ];

  return (
    <div dir="rtl" className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl gradient-emerald grid place-items-center shadow-soft">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold">{t("app_name")}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((n) => (
              <a
                key={n.to}
                href={n.to}
                className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-1.5"
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <DialectToggle />
            <Button asChild variant="ghost" size="icon" title={t("settings")}>
              <Link to="/settings"><Settings className="h-4 w-4" /></Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={onSignOut} title={t("sign_out")}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {email && (
          <div className="mx-auto max-w-7xl px-6 pb-2 text-xs text-muted-foreground truncate">
            {email}
          </div>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
