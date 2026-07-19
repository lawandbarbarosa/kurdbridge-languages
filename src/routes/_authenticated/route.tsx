import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Use getSession() rather than getUser(): getSession() reads the session
    // from local storage and silently refreshes the access token via the
    // stored refresh token when needed, with no network round-trip required
    // for the common case. getUser() always makes a live request to Supabase's
    // Auth server, so any transient hiccup there (waking from sleep, a flaky
    // connection, a backgrounded tab reconnecting) was being treated as "not
    // signed in" and bounced people to /auth even though their session was
    // still perfectly valid. A genuinely expired/invalid session still
    // resolves session to null here, so real sign-outs still redirect.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth", search: { mode: "signin" } });
    return { user: session.user };
  },
  component: () => <Outlet />,
});
