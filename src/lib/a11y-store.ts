// Zero-dep tiny store for the dyslexia-friendly typeface toggle (no zustand);
// manual implementation, mirrors src/i18n/store.ts on purpose.

export type A11yTypeface = "default" | "dyslexic";

type Listener = () => void;
let currentTypeface: A11yTypeface = "default";
const listeners = new Set<Listener>();

function readInitial(): A11yTypeface {
  if (typeof window === "undefined") return "default";
  const stored = window.localStorage.getItem("kurd_a11y_typeface");
  return stored === "dyslexic" ? "dyslexic" : "default";
}

export function getA11yTypeface(): A11yTypeface {
  return currentTypeface;
}

export function setA11yTypeface(t: A11yTypeface) {
  currentTypeface = t;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("kurd_a11y_typeface", t);
    if (t === "dyslexic") {
      document.documentElement.setAttribute("data-a11y-typeface", "dyslexic");
    } else {
      document.documentElement.removeAttribute("data-a11y-typeface");
    }
  }
  listeners.forEach((l) => l());
}

export function subscribeA11yTypeface(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function hydrateA11yTypeface() {
  currentTypeface = readInitial();
  if (typeof document !== "undefined") {
    if (currentTypeface === "dyslexic") {
      document.documentElement.setAttribute("data-a11y-typeface", "dyslexic");
    } else {
      document.documentElement.removeAttribute("data-a11y-typeface");
    }
  }
  listeners.forEach((l) => l());
}
