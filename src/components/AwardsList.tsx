"use client";

import { useState } from "react";
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
  return (
    <div className="space-y-3">
      {awards.map((a) => (
        <AwardRow key={a.id} award={a} locked={locked} />
      ))}
    </div>
  );
}

function AwardRow({ award, locked }: { award: AwardItem; locked: boolean }) {
  const UI = useUI();
  const [pick, setPick] = useState(award.myCandidateId ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nameOf = (id: string | null) => award.candidates.find((c) => c.id === id)?.name ?? null;
  const settled = award.winnerCandidateId != null; // winner announced

  async function save(candidateId: string) {
    setPick(candidateId);
    setSaved(false);
    setErr(null);
    if (!candidateId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/awards/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awardId: award.id, candidateId }),
      });
      const data = await res.json();
      if (!res.ok) setErr(data.error || "error");
      else { setSaved(true); setTimeout(() => setSaved(false), 1500); }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2">
        <TrophyIcon className="text-gold-400" />
        <span className="font-bold">{award.name}</span>
      </div>

      {locked ? (
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
      ) : (
        <div className="space-y-1">
          <select
            value={pick}
            onChange={(e) => save(e.target.value)}
            disabled={saving}
            className="input w-full"
          >
            <option value="">{UI.chooseCandidate}</option>
            {award.candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.team ? ` — ${c.team}` : ""}
              </option>
            ))}
          </select>
          {saved && (
            <p className="flex items-center gap-1 text-xs text-lime-400">
              <CheckIcon /> {UI.awardSaved}
            </p>
          )}
          {err && <p className="text-xs text-red-300">{err}</p>}
        </div>
      )}
    </div>
  );
}
