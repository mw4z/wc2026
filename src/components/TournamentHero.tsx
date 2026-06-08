// Presentational tournament banner (no client JS). Original art only.
export function TournamentHero({
  title,
  subtitle,
  showMascot = true,
}: {
  title: string;
  subtitle?: string;
  showMascot?: boolean;
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
      <img src="/art/stadium.svg" alt="" className="absolute inset-x-0 bottom-0 h-28 w-full object-cover opacity-90" />

      <div className="relative flex items-center justify-between gap-4 px-5 py-7 sm:px-8 sm:py-9">
        <div>
          <div className="mb-1 text-3xl">🏆</div>
          <h1 className="text-2xl font-black leading-tight text-white drop-shadow sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-md text-sm text-white/85">{subtitle}</p>}
        </div>
        {showMascot && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/art/mascot.svg" alt="" className="h-28 w-auto drop-shadow-lg sm:h-32" />
        )}
      </div>
    </div>
  );
}

// Friendly empty-state with the mascot.
export function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
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
