"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";
import { Spinner } from "@/components/Spinner";

interface Candidate { id: string; nameAr: string; nameEn: string; team: string | null }
interface Award { id: string; nameAr: string; nameEn: string; winnerCandidateId: string | null; candidates: Candidate[] }

export function AdminAwards({ awards }: { awards: Award[] }) {
  return (
    <div className="space-y-4">
      {awards.map((a) => <AwardCard key={a.id} award={a} />)}
    </div>
  );
}

function AwardCard({ award }: { award: Award }) {
  const UI = useUI();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [ar, setAr] = useState("");
  const [en, setEn] = useState("");
  const [team, setTeam] = useState("");
  const [winner, setWinner] = useState(award.winnerCandidateId ?? "");

  async function call(url: string, method: string, body?: object) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) router.refresh();
      else alert((await res.json()).error || "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="mb-3 font-bold text-gold-300">{award.nameAr} · {award.nameEn}</div>

      {/* Candidates */}
      <div className="mb-3 space-y-1">
        {award.candidates.length === 0 ? (
          <p className="text-sm text-slate-500">{UI.admin.noCandidates}</p>
        ) : (
          award.candidates.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded border border-white/10 px-2 py-1 text-sm">
              <span>
                {c.nameAr} · {c.nameEn}{c.team ? ` — ${c.team}` : ""}
                {award.winnerCandidateId === c.id && <span className="ms-2 rounded bg-gold-500/20 px-1.5 text-xs text-gold-300">★ {UI.admin.winnerLabel}</span>}
              </span>
              <button onClick={() => call(`/api/admin/awards/candidates?id=${c.id}`, "DELETE")} disabled={busy} className="text-xs text-red-300 hover:underline">
                {UI.admin.delete}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add candidate */}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <input className="input w-32" placeholder={UI.admin.candidateNameAr} value={ar} onChange={(e) => setAr(e.target.value)} />
        <input className="input w-32" placeholder={UI.admin.candidateNameEn} value={en} onChange={(e) => setEn(e.target.value)} dir="ltr" />
        <input className="input w-28" placeholder={UI.admin.candidateTeam} value={team} onChange={(e) => setTeam(e.target.value)} />
        <button
          onClick={() => { if (ar && en) { call("/api/admin/awards/candidates", "POST", { awardId: award.id, nameAr: ar, nameEn: en, team }); setAr(""); setEn(""); setTeam(""); } }}
          disabled={busy || !ar || !en}
          className="btn-ghost px-3 py-2 text-sm"
        >
          {UI.admin.addCandidate}
        </button>
      </div>

      {/* Set winner */}
      {award.candidates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <select className="input w-48" value={winner} onChange={(e) => setWinner(e.target.value)}>
            <option value="">{UI.chooseCandidate}</option>
            {award.candidates.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
          </select>
          <button onClick={() => call("/api/admin/awards/winner", "POST", { awardId: award.id, candidateId: winner || null })} disabled={busy} className="btn-gold px-3 py-2 text-sm">
            {busy ? <Spinner /> : winner ? UI.admin.setWinner : UI.admin.clearWinner}
          </button>
        </div>
      )}
    </div>
  );
}
