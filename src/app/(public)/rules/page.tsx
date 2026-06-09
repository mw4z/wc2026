import type { Metadata } from "next";
import { getUI } from "@/lib/locale";
import { AdSlot } from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";

export const metadata: Metadata = {
  title: "القواعد — توقعات كأس 2026",
  description: "شرح طريقة المشاركة ونظام النقاط وقواعد كسر التعادل في لعبة التوقعات.",
};

export const dynamic = "force-dynamic";

export default async function PublicRulesPage() {
  const UI = await getUI();
  const r = UI.rulesPage;

  const Section = ({ title, items, ordered }: { title: string; items: readonly string[]; ordered?: boolean }) => (
    <section className="card mb-4 p-5">
      <h2 className="mb-2 font-bold text-gold-400">{title}</h2>
      {ordered ? (
        <ol className="list-decimal space-y-1 ps-5 text-sm text-slate-300">
          {items.map((t) => <li key={t}>{t}</li>)}
        </ol>
      ) : (
        <ul className="list-disc space-y-1 ps-5 text-sm text-slate-300">
          {items.map((t) => <li key={t}>{t}</li>)}
        </ul>
      )}
    </section>
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-white">{UI.rules}</h1>
      <Section title={r.howToTitle} items={r.howTo} />
      <Section title={r.groupScoringTitle} items={r.groupScoring} />
      <section className="card mb-4 p-5">
        <h2 className="mb-2 font-bold text-gold-400">{r.koScoringTitle}</h2>
        <ul className="list-disc space-y-1 ps-5 text-sm text-slate-300">
          {r.koScoring.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <p className="mt-3 rounded-lg bg-navy-800 p-3 text-xs text-slate-400">{r.koNote}</p>
      </section>
      <Section title={r.tieTitle} items={r.tie} ordered />

      <AdSlot slotId={AD_SLOTS.rulesBottom} slotName="rules-bottom" />
    </div>
  );
}
