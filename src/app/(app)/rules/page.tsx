import { getUI } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const UI = await getUI();
  const r = UI.rulesPage;
  return (
    <div className="prose-invert mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-extrabold">{UI.rules}</h1>

      <section className="card mb-4 p-5">
        <h2 className="mb-2 font-bold text-gold-400">{r.howToTitle}</h2>
        <ul className="list-disc space-y-1 ps-5 text-sm text-slate-300">
          {r.howTo.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-2 font-bold text-gold-400">{r.groupScoringTitle}</h2>
        <ul className="list-disc space-y-1 ps-5 text-sm text-slate-300">
          {r.groupScoring.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-2 font-bold text-gold-400">{r.koScoringTitle}</h2>
        <ul className="list-disc space-y-1 ps-5 text-sm text-slate-300">
          {r.koScoring.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="mt-3 rounded-lg bg-navy-800 p-3 text-xs text-slate-400">{r.koNote}</p>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 font-bold text-gold-400">{r.tieTitle}</h2>
        <ol className="list-decimal space-y-1 ps-5 text-sm text-slate-300">
          {r.tie.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
