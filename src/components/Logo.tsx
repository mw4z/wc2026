"use client";

import { useState } from "react";

// Original "26" emblem — bold WC26-style numeral on a gradient roundel.
// License-safe original geometry (NOT the trademarked FIFA mark). Used as the
// fallback whenever no official /public/art/logo.png is present.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 44" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wc26-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b7bff" />
          <stop offset="0.55" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#aef000" />
        </linearGradient>
      </defs>
      <rect x="1" y="3" width="46" height="38" rx="11" fill="url(#wc26-grad)" />
      <rect
        x="1.7"
        y="3.7"
        width="44.6"
        height="36.6"
        rx="10.5"
        fill="none"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth="1.2"
      />
      <text
        x="24"
        y="22.5"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        style={{
          fontFamily: "var(--font-display), system-ui, sans-serif",
          fontWeight: 900,
          fontSize: "25px",
          letterSpacing: "-1.5px",
        }}
      >
        26
      </text>
    </svg>
  );
}

// Renders the official logo from /public/art/logo.png if present; otherwise
// falls back to the original vector mark. Drop the real (licensed) file there
// and it appears everywhere automatically.
export function BrandMark({ className = "" }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <LogoMark className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/art/logo.png"
      alt="توقعات كأس العالم 2026"
      className={`object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}

// Full lockup for the header: brand mark + Arabic wordmark with a Latin kicker.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <BrandMark className="h-9 w-9 shrink-0" />
      <span className="hidden leading-none sm:flex sm:flex-col">
        <span className="text-sm font-extrabold tracking-tight text-white">توقعات كأس العالم</span>
        <span className="font-display text-[11px] font-bold uppercase tracking-widest2 text-accent-400">
          World Cup 26
        </span>
      </span>
    </span>
  );
}
