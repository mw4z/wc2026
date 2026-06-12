"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Spinner } from "@/components/Spinner";
import { useUI } from "@/components/I18nProvider";
import { ShareIcon, TrophyIcon } from "@/components/icons";

interface Row {
  userId: string;
  name: string;
  totalPoints: number;
  rank: number;
}

// "Pro" share: renders an off-screen branded card of the group's standings to a
// PNG, then shares it via the native share sheet (image + auto text + app link).
// Falls back to download + WhatsApp text where file-share isn't supported.
export function ShareLeaderboard({
  groupName,
  code,
  rows,
  currentUserId,
}: {
  groupName: string;
  code: string;
  rows: Row[];
  currentUserId: string;
}) {
  const UI = useUI();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const top = rows.slice(0, 10);

  async function share() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const link = `${window.location.origin}/join/${code}`;
      const text = `${UI.shareBoardText.replace("{name}", groupName)}\n${link}`;
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `gamepredict-${code}.png`, { type: "image/png" });

      const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text });
      } else {
        // Fallback: download the image, then open WhatsApp prefilled with the text.
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `gamepredict-${code}.png`;
        a.click();
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      }
    } catch {
      /* user canceled / capture failed — no-op */
    } finally {
      setBusy(false);
    }
  }

  const medal = (rank: number) =>
    rank === 1
      ? { background: "rgba(233,185,73,0.20)", color: "#e9b949" }
      : rank === 2
        ? { background: "rgba(255,255,255,0.12)", color: "#e2e8f0" }
        : rank === 3
          ? { background: "rgba(180,83,9,0.22)", color: "#fbbf24" }
          : { background: "rgba(255,255,255,0.06)", color: "#cbd5e1" };

  return (
    <>
      <button onClick={share} disabled={busy} className="action-btn is-wa">
        {busy ? <Spinner /> : <ShareIcon className="ab-ic" />}
        {UI.shareLeaderboard}
      </button>

      {/* Off-screen branded card — captured to PNG. */}
      <div aria-hidden="true" style={{ position: "fixed", left: "-10000px", top: 0, pointerEvents: "none" }}>
        <div
          ref={cardRef}
          dir="rtl"
          style={{
            width: 620,
            fontFamily: "var(--font-sans), system-ui, sans-serif",
            background: "#070b15",
            color: "#ffffff",
            padding: 0,
            overflow: "hidden",
            borderRadius: 18,
          }}
        >
          <div style={{ height: 6, background: "linear-gradient(90deg,#2b7bff,#7c5cff 55%,#aef000)" }} />
          <div style={{ padding: 28 }}>
            {/* Brand header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>GamePredict</div>
                <div style={{ fontSize: 14, color: "#8aa0bf" }}>توقعات المباريات</div>
              </div>
              <span
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: "rgba(233,185,73,0.16)",
                  color: "#e9b949",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                <TrophyIcon />
              </span>
            </div>

            {/* Group title */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#aef000" }}>ترتيب المجموعة</div>
              <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.2 }}>{groupName}</div>
            </div>

            {/* Rows */}
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
              {top.map((r, i) => (
                <div
                  key={r.userId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 14px",
                    borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)",
                    background: r.userId === currentUserId ? "rgba(233,185,73,0.10)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 14,
                        ...medal(r.rank),
                      }}
                    >
                      {r.rank}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 18 }}>{r.name}</span>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 18, color: "#e9b949" }}>{r.totalPoints}</span>
                </div>
              ))}
              {top.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>—</div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                color: "#8aa0bf",
              }}
            >
              <span style={{ fontWeight: 700, color: "#cbd5e1" }}>gamepredict.net</span>
              <span>كود الانضمام: {code}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
