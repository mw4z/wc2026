import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/**
 * Server-side phone normalization to E.164 (e.g. "+966551234567").
 * Accepts national formats for the selected country (e.g. SA: 05xxxxxxxx,
 * 5xxxxxxxx, +9665xxxxxxxx) and ignores spaces/hyphens. Returns null if invalid.
 * Naming kept generic so an OTP step can be layered on later.
 */
export function normalizePhone(input: string, country: string): string | null {
  const parsed = parsePhoneNumberFromString((input ?? "").trim(), country as CountryCode);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number; // E.164
}

/** Mask a phone for any non-admin context (defense in depth; we avoid showing it at all). */
export function maskPhone(e164: string | null): string {
  if (!e164) return "—";
  return e164.length <= 4 ? "••••" : `${e164.slice(0, 4)}••••${e164.slice(-2)}`;
}
