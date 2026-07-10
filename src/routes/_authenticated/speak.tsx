import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/speak")({
  ssr: false,
  component: SpeakPage,
});

function SpeakPage() {
  return <div style={{ padding: 40, fontSize: 24 }}>SPEAK PAGE OK</div>;
}
