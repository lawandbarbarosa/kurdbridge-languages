import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useDialect } from "@/hooks/use-dialect";
import { getElevenLabsToken } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/speak")({
  ssr: false,
  component: SpeakPage,
});

type Line = { role: "user" | "agent"; text: string; ts: number };

function SpeakPage() {
  const { t } = useDialect();
  const fetchToken = useServerFn(getElevenLabsToken);
  const envAgent = (import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined) ?? "";
  const [agentId, setAgentId] = useState<string>(envAgent);
  const [connecting, setConnecting] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const linesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!envAgent && typeof window !== "undefined") {
      const stored = localStorage.getItem("elevenlabs_agent_id");
      if (stored) setAgentId(stored);
    }
  }, [envAgent]);

  const conversation = { status: "disconnected" as const, isSpeaking: false, startSession: async (_: unknown) => "", endSession: async () => {} };
  // const conversation = useConversation({ ... });

  useEffect(() => { linesRef.current?.scrollTo({ top: linesRef.current.scrollHeight, behavior: "smooth" }); }, [lines]);

  const start = useCallback(async () => {
    if (!agentId) { toast.error(t("speak_agent_id_help")); return; }
    setConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setConnecting(false);
      toast.error(t("mic_denied"));
      return;
    }
    try {
      if (typeof window !== "undefined") localStorage.setItem("elevenlabs_agent_id", agentId);
      const { token } = await fetchToken({ data: { agentId } });
      await conversation.startSession({ conversationToken: token, connectionType: "webrtc" });
    } catch (err) {
      setConnecting(false);
      toast.error(err instanceof Error ? err.message : "connect error");
    }
  }, [agentId, conversation, fetchToken, t]);

  const stop = useCallback(async () => { await conversation.endSession(); }, [conversation]);

  const status = conversation.status;
  const isActive = status === "connected";

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Sparkles className="h-7 w-7 text-primary" />{t("speak_title")}</h1>
        <p className="text-muted-foreground mt-1">{t("speak_sub")}</p>
      </div>

      {!envAgent && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <label className="text-sm font-medium">{t("speak_agent_id_prompt")}</label>
            <p className="text-xs text-muted-foreground mb-2">{t("speak_agent_id_help")}</p>
            <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agent_..." />
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? "default" : "outline"}>
              {connecting ? t("speak_connecting") : isActive ? (conversation.isSpeaking ? t("speak_speaking") : t("speak_listening")) : t("speak_ready")}
            </Badge>
          </div>
          {!isActive ? (
            <Button size="lg" onClick={start} disabled={connecting} className="gap-2">
              <Mic className="h-5 w-5" /> {t("speak_start")}
            </Button>
          ) : (
            <Button size="lg" variant="destructive" onClick={stop} className="gap-2">
              <MicOff className="h-5 w-5" /> {t("speak_stop")}
            </Button>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-2">{t("speak_transcript")}</h2>
        <div ref={linesRef} className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-2 bg-card">
          {lines.length === 0 && <p className="text-muted-foreground text-sm">—</p>}
          {lines.map((l, i) => (
            <div key={i} className={`flex ${l.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${l.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <div className="text-xs opacity-70 mb-0.5">{l.role === "user" ? "You" : "Bot"}</div>
                {l.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
