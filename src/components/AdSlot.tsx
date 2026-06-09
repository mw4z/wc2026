"use client";

import { useEffect } from "react";
import { adsActive, ADSENSE_CLIENT_ID } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * A single AdSense slot. Renders NOTHING unless ads are active AND a slotId is
 * provided — so with ads disabled there's no container, no script, no layout
 * shift. Clearly labelled "إعلان"; never styled like app controls.
 */
export function AdSlot({
  slotId,
  slotName,
  className = "",
  format = "auto",
  responsive = true,
}: {
  slotId: string | undefined;
  slotName: string;
  className?: string;
  format?: string;
  responsive?: boolean;
}) {
  useEffect(() => {
    if (!adsActive || !slotId) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense not ready yet; safe to ignore */
    }
  }, [slotId]);

  if (!adsActive || !slotId) return null;

  return (
    <div className={`my-6 ${className}`} data-ad-name={slotName}>
      <div className="mb-1 text-center text-[10px] uppercase tracking-widest text-slate-500">إعلان</div>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
