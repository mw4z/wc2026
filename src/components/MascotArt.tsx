"use client";

import { useState } from "react";

// Renders /public/art/mascot.png if present; renders nothing if the file is
// absent (so the broadcast layout stays clean until a licensed image is added).
// Drop a transparent PNG there and it appears in heroes automatically.
export function MascotArt({ className = "" }: { className?: string }) {
  // Hidden until the file actually loads, so a missing mascot.png shows nothing
  // instead of a broken-image glyph.
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/art/mascot.png"
      alt=""
      aria-hidden="true"
      className={loaded ? className : "hidden"}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
