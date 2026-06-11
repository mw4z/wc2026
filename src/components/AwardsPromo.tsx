import Link from "next/link";
import { getUI } from "@/lib/locale";
import { TrophyIcon, ArrowIcon } from "@/components/icons";

// Eye-catching promo for the tournament-awards feature, shown on /matches to
// members whose group enabled awards. Gold/violet gradient + animated sheen.
// The CTA reflects the user's progress so it never says "predict now" once done.
export async function AwardsPromo({
  locked,
  predicted = 0,
  total = 0,
}: {
  locked: boolean;
  predicted?: number;
  total?: number;
}) {
  const UI = await getUI();
  const allDone = total > 0 && predicted >= total;
  const cta = locked
    ? UI.awardsPromoView
    : allDone
      ? UI.awardsPromoEdit
      : predicted > 0
        ? UI.awardsPromoContinue
        : UI.awardsPromoCta;
  // Show progress once they've started; otherwise the feature pitch.
  const desc =
    !locked && predicted > 0
      ? UI.awardsProgress.replace("{done}", String(predicted)).replace("{total}", String(total))
      : UI.awardsPromoDesc;
  return (
    <Link
      href="/awards"
      className="group relative mb-5 block overflow-hidden rounded-2xl border border-gold-500/40 bg-gradient-to-l from-gold-500/20 via-[#7c5cff]/12 to-accent-500/15 p-4 transition hover:border-gold-400/70"
    >
      <div className="relative flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gold-500/20 text-3xl text-gold-300 ring-1 ring-gold-400/40">
          <TrophyIcon className="loader-bob" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="mb-1 inline-block rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-extrabold text-navy-950">
            {UI.awardsPromoTag}
          </span>
          <h3 className="font-display text-base font-extrabold leading-tight text-white">{UI.awardsPromoTitle}</h3>
          <p className="mt-0.5 truncate text-xs text-gold-200/90">{desc}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-gold-500 px-3 py-2 text-sm font-bold text-navy-950 transition group-hover:gap-2">
          {cta}
          <ArrowIcon className="text-base" />
        </span>
      </div>
      {!locked && !allDone && (
        <p className="relative mt-2 text-center text-[11px] font-semibold text-amber-200/80">
          ⏳ {UI.awardsPromoLockHint}
        </p>
      )}
    </Link>
  );
}
