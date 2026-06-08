// Original WC26 emblem — a gradient roundel with a stylized ball. Not the
// official competition mark; license-safe original geometry.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wc26-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b7bff" />
          <stop offset="0.55" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#aef000" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#wc26-grad)" />
      <rect
        x="1.6"
        y="1.6"
        width="36.8"
        height="36.8"
        rx="10.6"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.2"
      />
      {/* stylized ball */}
      <circle cx="20" cy="20" r="9.6" fill="#070b15" />
      <g stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" fill="none">
        <path d="m20 14.6 4.2 3-1.6 4.9h-5.2l-1.6-4.9 4.2-3Z" />
        <path d="M20 14.6V11M24.2 17.6l3.4-1.1M22.6 22.5l2.3 2.9M17.4 22.5l-2.3 2.9M15.8 17.6l-3.4-1.1" />
      </g>
    </svg>
  );
}

// Full lockup for the header: emblem + Arabic wordmark with a Latin kicker.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-9 w-9 shrink-0" />
      <span className="hidden leading-none sm:flex sm:flex-col">
        <span className="text-sm font-extrabold tracking-tight text-white">توقعات كأس العالم</span>
        <span className="font-display text-[11px] font-bold uppercase tracking-widest2 text-accent-400">
          World Cup 26
        </span>
      </span>
    </span>
  );
}
