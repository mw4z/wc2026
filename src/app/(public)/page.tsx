import type { Metadata } from "next";
import Link from "next/link";
import { ACTIVE_TOURNAMENT } from "@/lib/tournament";
import { SITE_URL } from "@/lib/site";

const TITLE = "GamePredict — توقعات المباريات";
const DESCRIPTION =
  "انضم لتحدي توقعات كأس 2026، توقّع النتائج، نافس أصحابك في المجموعات، وتابع ترتيبك بعد كل مباراة.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: { title: TITLE, description: DESCRIPTION, images: ["/og-default.png"] },
};

const FEATURES = [
  { t: "توقّع قبل الانطلاق", d: "أدخل نتيجتك المتوقعة لكل مباراة قبل صافرة البداية." },
  { t: "إغلاق تلقائي", d: "يُغلق التوقع تلقائيًا عند بداية المباراة ولا يمكن تعديله بعدها." },
  { t: "نقاط حسب الدقة", d: "تُحتسب نقاطك حسب دقة توقعك: نتيجة دقيقة، أو فائز/تعادل صحيح." },
  { t: "مجموعات", d: "أنشئ مجموعة أو انضم إلى مجموعة أصدقائك عبر كود، ونافسهم." },
  { t: "لوحة المتصدرين", d: "تابع ترتيبك العام وترتيب مجموعتك أولًا بأول." },
];

export default function LandingPage() {
  return (
    <div className="space-y-10">
      <section className="text-center">
        <span className="font-display text-xs font-bold uppercase tracking-widest text-accent-400">
          GamePredict · Football Predictions
        </span>
        <h1 className="hero-title mt-2 text-4xl font-black leading-tight">توقّع، نافس، واصعد للصدارة</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-300">
          لعبة مجانية لتوقّع نتائج المباريات: توقّع قبل انطلاق كل مباراة، اجمع النقاط حسب دقّتك، ونافس
          أصدقاءك على الصدارة.
        </p>
        <div className="mt-4 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-500/30 bg-accent-500/10 px-3.5 py-1.5 text-sm font-semibold text-accent-200">
            <span className="text-accent-200/70">البطولة الحالية:</span>
            <span className="font-bold text-white">{ACTIVE_TOURNAMENT.nameAr}</span>
          </span>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/matches" className="btn-primary">ابدأ الآن</Link>
          <Link href="/rules" className="btn-ghost">قراءة القواعد</Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.t} className="card p-5">
            <h2 className="mb-1 font-bold text-gold-400">{f.t}</h2>
            <p className="text-sm text-slate-300">{f.d}</p>
          </div>
        ))}
      </section>

      <section className="card card-accent p-6 text-center">
        <h2 className="text-lg font-bold text-white">جاهز للمنافسة؟</h2>
        <p className="mt-1 text-sm text-slate-300">سجّل ببريدك الإلكتروني في خطوة واحدة وابدأ بالتوقع.</p>
        <Link href="/matches" className="btn-primary mt-4 inline-flex">ابدأ الآن</Link>
      </section>

      <p className="mx-auto max-w-xl text-center text-xs text-slate-400">
        التطبيق مجاني وللترفيه والمنافسة الودية فقط — بدون جوائز. التطبيق مستقل وغير تابع رسميًا لـ FIFA أو أي
        جهة رياضية رسمية.
      </p>
    </div>
  );
}
