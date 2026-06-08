"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Team {
  id: string;
  name: string;
}

export function ResultForm({
  matchId,
  isKnockout,
  home,
  away,
  current,
}: {
  matchId: string;
  isKnockout: boolean;
  home: Team;
  away: Team;
  current: {
    homeScore: number | null;
    awayScore: number | null;
    wentToPenalties: boolean;
    winnerTeamId: string | null;
  };
}) {
  const router = useRouter();
  const [h, setH] = useState(current.homeScore?.toString() ?? "");
  const [a, setA] = useState(current.awayScore?.toString() ?? "");
  const [pens, setPens] = useState(current.wentToPenalties);
  const [winner, setWinner] = useState(current.winnerTeamId ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeScore: Number(h),
          awayScore: Number(a),
          wentToPenalties: pens,
          winnerTeamId: isKnockout ? winner || null : null,
        }),
      });
      const data = await res.json();
      setMsg({ ok: res.ok, text: res.ok ? "تم حفظ النتيجة واحتساب النقاط ✔" : data.error });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-navy-700 pt-3">
      <div className="flex items-center justify-center gap-3">
        <input className="input w-16 text-center" type="number" min={0} value={h} onChange={(e) => setH(e.target.value)} aria-label={home.name} />
        <span>:</span>
        <input className="input w-16 text-center" type="number" min={0} value={a} onChange={(e) => setA(e.target.value)} aria-label={away.name} />
      </div>

      {isKnockout && (
        <div className="space-y-2">
          <label className="flex items-center justify-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={pens} onChange={(e) => setPens(e.target.checked)} />
            ذهبت إلى ركلات الترجيح
          </label>
          <div className="flex gap-2">
            {[home, away].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setWinner(t.id)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-sm ${
                  winner === t.id ? "border-gold-500 bg-gold-500/15 text-gold-300" : "border-navy-600"
                }`}
              >
                المتأهل: {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {msg && <p className={`text-center text-sm ${msg.ok ? "text-ok" : "text-red-300"}`}>{msg.text}</p>}

      <button onClick={save} disabled={busy || h === "" || a === ""} className="btn-gold w-full">
        {busy ? "..." : "حفظ النتيجة واحتساب النقاط"}
      </button>
    </div>
  );
}
