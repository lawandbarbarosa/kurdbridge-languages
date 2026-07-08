import { sorani, type TranslationKey } from "./sorani";
import { badini } from "./badini";
import { english } from "./english";

export type Dialect = "sorani" | "badini" | "english";

const dictionaries: Record<Dialect, Record<TranslationKey, string>> = { sorani, badini, english };


// Zero-dep tiny store (no zustand); manual implementation
type Listener = () => void;
let currentDialect: Dialect = "sorani";
const listeners = new Set<Listener>();

function readInitial(): Dialect {
  if (typeof window === "undefined") return "sorani";
  const stored = window.localStorage.getItem("kurd_dialect");
  if (stored === "badini" || stored === "english") return stored;
  return "sorani";
}

export function getDialect(): Dialect {
  return currentDialect;
}

function dirFor(d: Dialect): "ltr" | "rtl" {
  return d === "english" ? "ltr" : "rtl";
}

function langFor(d: Dialect): string {
  return d === "english" ? "en" : "ku";
}

export function setDialect(d: Dialect) {
  currentDialect = d;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("kurd_dialect", d);
    document.documentElement.setAttribute("data-dialect", d);
    document.documentElement.setAttribute("dir", dirFor(d));
    document.documentElement.setAttribute("lang", langFor(d));
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
    document.documentElement.setAttribute("dir", dirFor(currentDialect));
    document.documentElement.setAttribute("lang", langFor(currentDialect));
  }
  listeners.forEach((l) => l());
}

export function t(key: TranslationKey): string {
  return dictionaries[currentDialect][key];
}

export { sorani, badini, english };
