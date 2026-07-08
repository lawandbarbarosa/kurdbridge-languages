import { useSyncExternalStore } from "react";
import {
  getDialect,
  setDialect as setDialectRaw,
  subscribeDialect,
  hydrateDialect,
  t as tRaw,
  type Dialect,
} from "@/i18n/store";
import { sorani, type TranslationKey } from "@/i18n/sorani";
import { badini } from "@/i18n/badini";
import { english } from "@/i18n/english";

export function useDialect() {
  const dialect = useSyncExternalStore(
    subscribeDialect,
    getDialect,
    () => "sorani" as Dialect,
  );
  const dict = dialect === "badini" ? badini : dialect === "english" ? english : sorani;
  return {
    dialect,
    setDialect: setDialectRaw,
    t: (key: TranslationKey) => dict[key],
  };
}

export { hydrateDialect, tRaw, type Dialect };
