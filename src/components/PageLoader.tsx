import { BallIcon } from "./icons";

// Branded, animated route loader. Pure CSS animations (no client JS) so it paints
// instantly as the Suspense fallback while a tab's server page streams in.
export function PageLoader({
  title,
  subtitle,
  cards = 3,
}: {
  title: string;
  subtitle: string;
  cards?: number;
}) {
  return (
    <div>
      {/* Centered spinning ball inside a pulsing "pitch" ring */}
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative grid h-28 w-28 place-items-center">
          <span className="loader-ring absolute inset-0 rounded-full border border-accent-500/30" />
          <span className="loader-ring-spin absolute inset-2 rounded-full border-2 border-dashed border-accent-500/40" />
          <span className="absolute inset-0 -z-10 rounded-full bg-accent-500/10 blur-2xl" />
          <span className="loader-bob text-accent-300">
            <BallIcon className="loader-ball text-5xl" />
          </span>
        </div>

        <div className="mt-6 font-display text-lg font-extrabold tracking-wide text-white">{title}</div>

        <div className="mt-1 flex items-center gap-1 text-sm text-slate-400">
          <span>{subtitle}</span>
          <span className="loader-dot" style={{ animationDelay: "0ms" }}>.</span>
          <span className="loader-dot" style={{ animationDelay: "150ms" }}>.</span>
          <span className="loader-dot" style={{ animationDelay: "300ms" }}>.</span>
        </div>

        {/* Indeterminate progress bar */}
        <div className="relative mt-5 h-1 w-44 overflow-hidden rounded-full bg-white/10">
          <span className="loader-bar" />
        </div>
      </div>

      {/* Shimmer skeletons so the page feels like it's materializing */}
      {cards > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: cards }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-4">
      <div className="mb-5 flex items-center justify-between">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center justify-between gap-2 px-2">
        <div className="flex flex-1 flex-col items-center gap-2">
          <div className="skeleton h-12 w-12 rounded-full" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
        <div className="skeleton h-7 w-7 rounded" />
        <div className="flex flex-1 flex-col items-center gap-2">
          <div className="skeleton h-12 w-12 rounded-full" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      </div>
      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <div className="skeleton h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}
