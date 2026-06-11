"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { useUI } from "@/components/I18nProvider";
import { TrophyIcon, CheckIcon } from "@/components/icons";

interface Candidate { id: string; name: string; team: string | null }
export interface AwardItem {
  id: string;
  name: string;
  winnerCandidateId: string | null;
  myCandidateId: string | null;
  points: number | null;
  candidates: Candidate[];
}

export function AwardsList({ awards, locked }: { awards: AwardItem[]; locked: boolean }) {
  const UI = useUI();
  const router = useRouter();

  // Lifted selection state so a single "Save all" can persist every pick.
  const initial = useMemo(
    () => Object.fromEntries(awards.map((a) => [a.id, a.myCandidateId ?? ""])),
    [awards],
  );
  const [picks, setPicks] = useState<Record<string, string>>(initial);
  const [saved, setSaved] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const total = awards.length;
  const done = awards.filter((a) => picks[a.id]).length;
  const dirty = awards.some((a) => picks[a.id] !== (saved[a.id] ?? ""));
  const allChosen = done === total;

  async function saveAll() {
    setSaving(true);
    setMsg(null);
    try {
      const changed = awards.filter((a) => picks[a.id] && picks[a.id] !== saved[a.id]);
      for (const a of changed) {
        const res = await fetch("/api/awards/predictions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ awardId: a.id, candidateId: picks[a.id] }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setMsg({ ok: false, text: d.error || UI.saveFailed });
          return;
        }
      }
      setSaved({ ...picks });
      setMsg({ ok: true, text: UI.awardsAllSaved });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: UI.connError });
    } finally {
      setSaving(false);
    }
  }

  // After lock: read-only results, no progress/save UI.
  if (locked) {
    return (
      <div className="space-y-3">
        {awards.map((a) => (
          <LockedAwardRow key={a.id} award={a} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main summary card — flips to a "completed" look once all are chosen. */}
      <div
        className={`card edge-accent p-4 ${allChosen ? "border-lime-500/30 bg-lime-500/[0.06]" : ""}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className={`font-bold ${allChosen ? "text-lime-400" : "text-gold-400"}`}>
              {allChosen ? UI.awardsAllChosen : UI.awardsProgress.replace("{done}", String(done)).replace("{total}", String(total))}
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              {dirty ? UI.awardsUnsaved : allChosen ? UI.awardsAllSaved : UI.awardsPickHint}
            </div>
          </div>
          <span className="shrink-0 font-display text-lg font-extrabold tnum text-slate-200">
            {done}/{total}
          </span>
        </div>
        {/* progress bar */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all ${allChosen ? "bg-lime-500" : "bg-accent-500"}`}
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {awards.map((a) => {
        const pickedName = a.candidates.find((c) => c.id === picks[a.id])?.name;
        return (
          <div key={a.id} className="card p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrophyIcon className="text-gold-400" />
                <span className="font-bold">{a.name}</span>
              </div>
              {picks[a.id] && <CheckIcon className="shrink-0 text-base text-lime-400" />}
            </div>
            <select
              value={picks[a.id] ?? ""}
              onChange={(e) => setPicks((p) => ({ ...p, [a.id]: e.target.value }))}
              className="input w-full"
              aria-label={a.name}
            >
              <option value="">{UI.chooseCandidate}</option>
              {a.candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.team ? ` — ${c.team}` : ""}
                </option>
              ))}
            </select>
            {picks[a.id] && pickedName && (
              <p className="mt-1 text-xs text-slate-500">
                {UI.yourPick}: <span className="text-slate-300">{pickedName}</span>
              </p>
            )}
          </div>
        );
      })}

      {msg && (
        <p className={`text-center text-sm ${msg.ok ? "text-lime-400" : "text-red-300"}`}>{msg.text}</p>
      )}

      {/* Save all — at the end. */}
      <button onClick={saveAll} disabled={saving || !dirty} className="btn-primary w-full">
        {saving ? <Spinner /> : UI.saveAll}
      </button>
    </div>
  );
}

function LockedAwardRow({ award }: { award: AwardItem }) {
  const UI = useUI();
  const nameOf = (id: string | null) => award.candidates.find((c) => c.id === id)?.name ?? null;
  const settled = award.winnerCandidateId != null;
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2">
        <TrophyIcon className="text-gold-400" />
        <span className="font-bold">{award.name}</span>
      </div>
      <div className="space-y-1 text-sm">
        <div>
          <span className="text-slate-400">{UI.yourPick}: </span>
          <span className="font-semibold text-slate-100">{nameOf(award.myCandidateId) ?? UI.notPicked}</span>
        </div>
        {settled ? (
          <>
            <div>
              <span className="text-slate-400">{UI.awardWinner}: </span>
              <span className="font-semibold text-gold-300">{nameOf(award.winnerCandidateId)}</span>
            </div>
            <div className={award.points && award.points > 0 ? "text-lime-400" : "text-slate-500"}>
              {award.points && award.points > 0
                ? UI.awardCorrectMsg.replace("{n}", String(award.points))
                : UI.awardWrongMsg}
            </div>
          </>
        ) : (
          <div className="text-xs text-slate-500">{UI.awardPending}</div>
        )}
      </div>
    </div>
  );
}
