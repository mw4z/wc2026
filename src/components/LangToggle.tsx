"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "./I18nProvider";
import { LOCALE_COOKIE } from "@/lib/i18n";

// Toggles AR <-> EN by setting the locale cookie and refreshing so server
// components re-render with the new dictionary and document direction.
export function LangToggle({ className = "" }: { className?: string }) {
  const router = useRouter();
  const locale = useLocale();
  const next = locale === "ar" ? "en" : "ar";

  function switchLang() {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={switchLang}
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      className={`inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-200 transition hover:border-accent-500/55 hover:bg-white/10 ${className}`}
    >
      {locale === "ar" ? "EN" : "ع"}
    </button>
  );
}
