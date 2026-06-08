import type { ReactNode } from "react";
import { LogoMark } from "./Logo";
import { MascotArt } from "./MascotArt";
import { BallIcon } from "./icons";

/**
 * Broadcast-style banner: deep navy panel, a cool accent glow, diagonal
 * line texture, a leading color shard, and a faded WC26 emblem watermark.
 * Original art only — no mascot, no emoji.
 */
export function TournamentHero({
  title,
  subtitle,
  kicker = "World Cup 26",
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  kicker?: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="reveal relative mb-6 overflow-hidden rounded-2xl border border-white/10 shadow-card">
      {/* base + accent glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 130% at 100% 0%, rgba(43,123,255,0.38), transparent 55%), linear-gradient(135deg, #0a1124 0%, #0e1c39 60%, #0a1430 100%)",
        }}
      />
      {/* diagonal line texture */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{ backgroundImage: "repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 15px)" }}
      />
      {/* leading color shard */}
      <div className="absolute -left-12 -top-6 h-[160%] w-28 -skew-x-12 bg-gradient-to-b from-accent-500/50 via-[#7c5cff]/30 to-lime-500/40 blur-[1px]" />
      {/* emblem watermark (vector) */}
      <LogoMark className="pointer-events-none absolute -left-6 bottom-[-1.5rem] h-40 w-40 opacity-[0.10]" />
      {/* official mascot art — appears only if /public/art/mascot.png exists */}
      <MascotArt className="pointer-events-none absolute bottom-0 left-2 h-24 w-auto object-contain drop-shadow-2xl sm:h-32" />

      <div className="relative px-5 py-6 sm:px-7 sm:py-8">
        <span className="eyebrow">{kicker}</span>
        <div className="mt-2 flex items-start gap-3">
          {icon && (
            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-xl text-accent-400 ring-1 ring-white/15">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 max-w-xl text-sm text-slate-300">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </section>
  );
}

/** Frosted broadcast stat chip for use inside a TournamentHero. */
export function HeroStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 backdrop-blur-sm">
      <b className="font-display tnum text-base text-white">{value}</b>
      <span className="text-xs text-white/70">{label}</span>
    </span>
  );
}

/** Friendly empty-state with a crafted icon (no mascot/emoji). */
export function EmptyState({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="card edge-accent flex flex-col items-center p-10 text-center">
      <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-accent-500/15 text-3xl text-accent-400 ring-1 ring-accent-500/25">
        {icon ?? <BallIcon />}
      </span>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-400">{hint}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
