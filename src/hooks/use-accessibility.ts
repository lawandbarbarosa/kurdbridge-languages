import { useSyncExternalStore } from "react";
import {
  getA11yTypeface,
  setA11yTypeface,
  subscribeA11yTypeface,
  hydrateA11yTypeface,
  type A11yTypeface,
} from "@/lib/a11y-store";

export function useAccessibility() {
  const typeface = useSyncExternalStore(
    subscribeA11yTypeface,
    getA11yTypeface,
    () => "default" as A11yTypeface,
  );
  return {
    typeface,
    isDyslexic: typeface === "dyslexic",
    setTypeface: setA11yTypeface,
    toggleTypeface: () => setA11yTypeface(typeface === "dyslexic" ? "default" : "dyslexic"),
  };
}

export { hydrateA11yTypeface, type A11yTypeface };
