// Presentational tournament identity (no client JS). Original art only.
// Layered: WC2026-style multicolor gradient + stadium skyline + optional mascot.
export function TournamentHero({
  title,
  subtitle,
  icon = "🏆",
  showMascot = true,
  compact = false,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Emoji/badge shown above the title. */
  icon?: string;
  showMascot?: boolean;
  /** Slimmer banner for secondary pages. */
  compact?: boolean;
  /** Stat chips / actions rendered under the subtitle. */
  children?: React.ReactNode;
}) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 shadow-card">
      {/* colorful WC2026-style gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(120deg, #d6336c 0%, #7c5cff 32%, #1f4fff 55%, #16c79a 78%, #e9b949 100%)",
          opacity: 0.9,
        }}
      />
      <div className="absolute inset-0 bg-navy-950/45" />
      {/* stadium skyline */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/art/stadium.svg"
        alt=""
        className={`absolute inset-x-0 bottom-0 w-full object-cover opacity-90 ${compact ? "h-20" : "h-28"}`}
      />

      <div
        className={`relative flex items-center justify-between gap-4 px-5 sm:px-8 ${
          compact ? "py-5 sm:py-6" : "py-7 sm:py-9"
        }`}
      >
        <div className="min-w-0">
          {icon && <div className={compact ? "mb-1 text-2xl" : "mb-1 text-3xl"}>{icon}</div>}
          <h1
            className={`font-black leading-tight text-white drop-shadow ${
              compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
            }`}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-1 max-w-md text-sm text-white/85">{subtitle}</p>}
          {children && <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>}
        </div>
        {showMascot && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/art/mascot.svg"
            alt=""
            className={`w-auto shrink-0 drop-shadow-lg ${compact ? "h-20 sm:h-24" : "h-28 sm:h-32"}`}
          />
        )}
      </div>
    </div>
  );
}

/** A frosted stat chip for use inside a TournamentHero. */
export function HeroStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-sm">
      <b className="font-extrabold tabular-nums">{value}</b>
      <span className="text-white/75">{label}</span>
    </span>
  );
}

// Friendly empty-state with the mascot.
export function EmptyState({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card card-accent flex flex-col items-center p-8 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/art/mascot.svg" alt="" className="mb-3 h-24 w-auto" />
      <h2 className="text-lg font-bold">{title}</h2>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-400">{hint}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
