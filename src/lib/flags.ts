// FIFA 3-letter team code → emoji flag, for text reminders/shares (the flagUrl
// images can't go in WhatsApp/plain text). Safe fallback 🏳️ — never blocks.

// FIFA code → ISO-3166 alpha-2 (only the codes that appear in our schedule).
const ISO2: Record<string, string> = {
  ALG: "DZ", ARG: "AR", AUS: "AU", AUT: "AT", BEL: "BE", BIH: "BA", BRA: "BR",
  CAN: "CA", CIV: "CI", COD: "CD", COL: "CO", CPV: "CV", CRO: "HR", CUW: "CW",
  CZE: "CZ", ECU: "EC", EGY: "EG", ESP: "ES", FRA: "FR", GER: "DE", GHA: "GH",
  HAI: "HT", IRN: "IR", IRQ: "IQ", JOR: "JO", JPN: "JP", KOR: "KR", KSA: "SA",
  MAR: "MA", MEX: "MX", NED: "NL", NOR: "NO", NZL: "NZ", PAN: "PA", PAR: "PY",
  POR: "PT", QAT: "QA", RSA: "ZA", SEN: "SN", SUI: "CH", SWE: "SE", TUN: "TN",
  TUR: "TR", URU: "UY", USA: "US", UZB: "UZ",
};

// UK home nations have their own subdivision tag-sequence emoji.
const SPECIAL: Record<string, string> = {
  ENG: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", // 🏴 England
  SCO: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}", // 🏴 Scotland
  WAL: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}", // 🏴 Wales
};

export function flagEmoji(code?: string | null): string {
  if (!code) return "🏳️";
  const c = code.toUpperCase();
  if (SPECIAL[c]) return SPECIAL[c];
  const iso = ISO2[c];
  if (!iso || iso.length !== 2) return "🏳️";
  return String.fromCodePoint(...[...iso].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}
