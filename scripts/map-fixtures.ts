// Map our 104 matches to provider fixture ids.
//   Dry run (report only):  npx tsx --env-file=.env scripts/map-fixtures.ts
//   Apply mappings to DB:   npx tsx --env-file=.env scripts/map-fixtures.ts --apply
//
// Only confident, same-orientation 1:1 matches are written. Ambiguous matches are
// reported and never auto-applied. Matches with TBD teams (e.g. knockouts before
// the bracket resolves) are reported as unmapped — re-run after teams are decided.
export {};

import { prisma } from "../src/lib/prisma";
import { fetchAllFixtures, footballApiConfigured, footballProvider } from "../src/lib/footballApi";
import { evaluateMapping, type FixtureCandidate } from "../src/lib/fixtureMapping";

const APPLY = process.argv.includes("--apply");

async function main() {
  if (!footballApiConfigured) {
    console.error("FOOTBALL_API_KEY is not set. Add it to .env and re-run with --env-file=.env");
    process.exitCode = 2;
    return;
  }

  console.log(`Provider: ${footballProvider}  |  mode: ${APPLY ? "APPLY" : "dry-run"}\n`);

  const parsed = await fetchAllFixtures();
  const fixtures: FixtureCandidate[] = parsed.map((f) => ({
    fixtureId: f.fixtureId,
    dateISO: f.dateISO,
    homeName: f.homeName,
    awayName: f.awayName,
    venue: f.venue,
  }));
  console.log(`Fetched ${fixtures.length} provider fixtures.\n`);

  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchNumber: "asc" },
  });

  const mapped: string[] = [];
  const ambiguous: string[] = [];
  const unmapped: string[] = [];

  for (const m of matches) {
    const label = `#${m.matchNumber} ${m.homeTeam?.nameEn ?? "TBD"} vs ${m.awayTeam?.nameEn ?? "TBD"}`;
    if (!m.homeTeam || !m.awayTeam) {
      unmapped.push(`${label}  (teams not decided)`);
      continue;
    }
    const decision = evaluateMapping(
      { kickoffAt: m.kickoffAt, homeName: m.homeTeam.nameEn, awayName: m.awayTeam.nameEn, venue: m.stadium },
      fixtures,
    );
    if (decision.status === "mapped") {
      mapped.push(`${label}  →  fixture ${decision.fixtureId}`);
      if (APPLY && m.externalFixtureId !== decision.fixtureId) {
        await prisma.match.update({
          where: { id: m.id },
          data: { externalProvider: footballProvider, externalFixtureId: decision.fixtureId },
        });
      }
    } else if (decision.status === "ambiguous") {
      ambiguous.push(`${label}  (${decision.note}; candidates: ${decision.candidateIds.join(", ")})`);
    } else {
      unmapped.push(`${label}  (${decision.note})`);
    }
  }

  const section = (title: string, items: string[]) => {
    console.log(`\n=== ${title} (${items.length}) ===`);
    items.forEach((s) => console.log("  " + s));
  };
  section("MAPPED", mapped);
  section("AMBIGUOUS (not applied)", ambiguous);
  section("UNMAPPED", unmapped);

  console.log(
    `\nSummary: ${mapped.length} mapped, ${ambiguous.length} ambiguous, ${unmapped.length} unmapped.` +
      (APPLY ? "  (mappings written to DB)" : "  (dry-run — re-run with --apply to write)"),
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exitCode = 1;
});
