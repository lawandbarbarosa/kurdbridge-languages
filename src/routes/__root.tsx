import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { hydrateDialect } from "@/hooks/use-dialect";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">لاپەڕەکە نەدۆزرایەوە</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          ئەم لاپەڕەیە بوونی نییە یان گواستراوەتەوە.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            بڕۆ بۆ سەرەکی
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          ئەم لاپەڕەیە بار نەبوو
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          هەڵەیەک ڕوویدا. دەتوانیت هەوڵبدەیت دووبارە بار بکەیت.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            دووبارە هەوڵبدە
          </button>
          
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            بڕۆ بۆ سەرەکی
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "بەتلیس — فێربوونی زمان بۆ کوردەکان" },
      {
        name: "description",
        content:
          "پلاتفۆرمی فێربوونی زمان بە کوردی: ئینگلیزی، ئەڵمانی، عەرەبی و کۆری بە ڕێنمایی تەواوی کوردی، لە A1 بۆ C2.",
      },
      { name: "author", content: "بەتلیس" },
      { property: "og:title", content: "بەتلیس — فێربوونی زمان بۆ کوردەکان" },
      {
        property: "og:description",
        content:
          "پلاتفۆرمی فێربوونی زمان بە کوردی: ئینگلیزی، ئەڵمانی، عەرەبی و کۆری بە ڕێنمایی تەواوی کوردی، لە A1 بۆ C2.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "بەتلیس — فێربوونی زمان بۆ کوردەکان" },
      { name: "twitter:description", content: "پلاتفۆرمی فێربوونی زمان بە کوردی: ئینگلیزی، ئەڵمانی، عەرەبی و کۆری بە ڕێنمایی تەواوی کوردی، لە A1 بۆ C2." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8e89d6be-1052-4571-9690-c3de13b0d2af/id-preview-eb54392e--dea7b988-58e2-43da-836e-f244e58356c5.lovable.app-1783538380087.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8e89d6be-1052-4571-9690-c3de13b0d2af/id-preview-eb54392e--dea7b988-58e2-43da-836e-f244e58356c5.lovable.app-1783538380087.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ku" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    hydrateDialect();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
