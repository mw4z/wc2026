"use client";

import { createContext, useContext } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("ar");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Returns the active dictionary for client components. */
export function useUI() {
  return getDictionary(useContext(LocaleContext));
}
