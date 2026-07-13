import { useAccessibility } from "@/hooks/use-accessibility";
import { useDialect } from "@/hooks/use-dialect";
import { Switch } from "@/components/ui/switch";
import { BookOpenCheck } from "lucide-react";

export function AccessibilityToggle() {
  const { isDyslexic, toggleTypeface } = useAccessibility();
  const { t } = useDialect();

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl squircle border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-xl squircle bg-accent text-accent-foreground grid place-items-center">
          <BookOpenCheck className="h-4.5 w-4.5" />
        </div>
        <div>
          <label htmlFor="a11y-dyslexic-toggle" className="font-semibold cursor-pointer">
            {t("dyslexia_friendly")}
          </label>
          <p className="text-sm text-muted-foreground mt-0.5">{t("dyslexia_friendly_desc")}</p>
        </div>
      </div>
      <Switch id="a11y-dyslexic-toggle" checked={isDyslexic} onCheckedChange={toggleTypeface} />
    </div>
  );
}
