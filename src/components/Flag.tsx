"use client";

import { useState } from "react";

/**
 * Robust flag image:
 *  - lazy-loads + async decode so a long match list doesn't fire 200+ requests
 *    at once on first paint (the burst was causing some to fail → broken "?"),
 *  - retries once with a cache-buster on error,
 *  - then falls back to a styled placeholder instead of the broken-image glyph.
 */
export function Flag({
  src,
  className = "",
  alt = "",
}: {
  src?: string | null;
  className?: string;
  alt?: string;
}) {
  const [tries, setTries] = useState(0);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`grid place-items-center rounded-md bg-navy-700 text-sm text-slate-400 ring-1 ring-white/15 ${className}`}
        aria-hidden
      >
        ؟
      </div>
    );
  }

  const url = tries === 0 ? src : `${src}?r=${tries}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`flag ${className}`}
      onError={() => (tries < 1 ? setTries((t) => t + 1) : setFailed(true))}
    />
  );
}
