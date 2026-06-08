// Copies the flag SVGs used by our 48 teams from the flag-icons package into
// /public/flags so they're served from our own origin. Run: npx tsx scripts/copy-flags.ts
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { TEAMS } from "../prisma/seed-data";

const src = new URL("../node_modules/flag-icons/flags/4x3/", import.meta.url);
const dest = new URL("../public/flags/", import.meta.url);
mkdirSync(dest, { recursive: true });

let copied = 0;
const missing: string[] = [];
for (const t of TEAMS) {
  const from = new URL(`${t.iso}.svg`, src);
  const to = new URL(`${t.iso}.svg`, dest);
  if (!existsSync(from)) {
    missing.push(`${t.code} -> ${t.iso}`);
    continue;
  }
  copyFileSync(from, to);
  copied++;
}

console.log(`Copied ${copied}/${TEAMS.length} flags to public/flags/`);
if (missing.length) console.log("MISSING:", missing.join(", "));
process.exit(missing.length ? 1 : 0);
