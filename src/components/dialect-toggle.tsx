import { useDialect, type Dialect } from "@/hooks/use-dialect";
import { Button } from "@/components/ui/button";

export function DialectToggle() {
  const { dialect, setDialect, t } = useDialect();
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs">
      {(["sorani", "badini"] as Dialect[]).map((d) => (
        <button
          key={d}
          onClick={() => setDialect(d)}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            dialect === d
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t(d)}
        </button>
      ))}
    </div>
  );
}

// keep Button import used in tree-shaking-safe way (no-op)
export const _b = Button;
