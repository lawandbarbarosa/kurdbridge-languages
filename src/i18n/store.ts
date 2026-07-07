import { sorani, type TranslationKey } from "./sorani";
import { badini } from "./badini";

export type Dialect = "sorani" | "badini";

const dictionaries: Record<Dialect, Record<TranslationKey, string>> = { sorani, badini };


// Zero-dep tiny store (no zustand); manual implementation
type Listener = () => void;
let currentDialect: Dialect = "sorani";
const listeners = new Set<Listener>();

function readInitial(): Dialect {
  if (typeof window === "undefined") return "sorani";
  const stored = window.localStorage.getItem("kurd_dialect");
  return stored === "badini" ? "badini" : "sorani";
}

export function getDialect(): Dialect {
  return currentDialect;
}

export function setDialect(d: Dialect) {
  currentDialect = d;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("kurd_dialect", d);
    document.documentElement.setAttribute("data-dialect", d);
  }
  listeners.forEach((l) => l());
}

export function subscribeDialect(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function hydrateDialect() {
  currentDialect = readInitial();
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-dialect", currentDialect);
    document.documentElement.setAttribute("dir", "rtl");
    document.documentElement.setAttribute("lang", "ku");
  }
  listeners.forEach((l) => l());
}

export function t(key: TranslationKey): string {
  return dictionaries[currentDialect][key];
}

export { sorani, badini };
