"use client";

import { useState } from "react";
import { useUI } from "./I18nProvider";

// Original World-Cup emblem — a championship trophy on the brand gradient.
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
      {/* trophy handles */}
      <g fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round">
        <path d="M16.8 14.5 C12 14.5 12 21 17 20.4" />
        <path d="M31.2 14.5 C36 14.5 36 21 31 20.4" />
      </g>
      {/* trophy cup + stem + base */}
      <g fill="#fff">
        <path d="M16.5 12.5 H31.5 V15.5 C31.5 21.8 28.2 25.6 24 25.6 C19.8 25.6 16.5 21.8 16.5 15.5 Z" />
        <rect x="22.7" y="25" width="2.6" height="4.4" rx="0.5" />
        <path d="M18.8 30.4 H29.2 L30.6 34 H17.4 Z" />
        <rect x="16.6" y="34.4" width="14.8" height="2.3" rx="1" />
      </g>
      {/* subtle shine on the cup */}
      <path d="M20 14.5 C20 18.8 21.4 21.6 23 22.4" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// Renders the official logo from /public/art/logo.png if present; otherwise
// falls back to the original vector mark. Drop the real (licensed) file there
// and it appears everywhere automatically.
export function BrandMark({ className = "" }: { className?: string }) {
  // Show the vector mark by default; reveal /art/logo.png only once it actually
  // loads. A missing file therefore shows the clean SVG, never a broken glyph.
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      {!loaded && <LogoMark className={className} />}
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/art/logo.png"
          alt="توقعات كأس العالم 2026"
          className={loaded ? `object-contain ${className}` : "hidden"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </>
  );
}

// Full lockup for the header: brand mark + Arabic wordmark with a Latin kicker.
export function Logo({ className = "" }: { className?: string }) {
  const UI = useUI();
  return (
    <span className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <BrandMark className="h-9 w-9 shrink-0" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-display text-base font-extrabold text-white">GamePredict</span>
        <span className="truncate text-[11px] font-semibold text-accent-400">{UI.appTagline}</span>
      </span>
    </span>
  );
}
