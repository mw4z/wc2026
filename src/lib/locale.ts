import "server-only";
import { cookies } from "next/headers";
import { getDictionary, normalizeLocale, LOCALE_COOKIE, type Locale } from "./i18n";

/** Reads the active locale from the cookie (server components / route handlers). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

/** Active dictionary for server components. */
export async function getUI() {
  return getDictionary(await getLocale());
}
