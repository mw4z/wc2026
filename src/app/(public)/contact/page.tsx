import type { Metadata } from "next";
import { CONTACT_WHATSAPP, CONTACT_WHATSAPP_LINK } from "@/lib/ads";

export const metadata: Metadata = {
  title: "تواصل معنا — توقعات كأس 2026",
  description: "تواصل مع فريق الدعم عبر واتساب لأي استفسار أو ملاحظة.",
};

export default function ContactPage() {
  return (
    <article className="space-y-4 text-slate-300">
      <h1 className="text-2xl font-extrabold text-white">تواصل معنا</h1>
      <p>
        لأي استفسار أو ملاحظة أو طلب يتعلّق بحسابك أو خصوصيتك، راسلنا على واتساب وسنردّ عليك في أقرب وقت:
      </p>
      <div className="card p-5 text-center">
        <div className="text-xs text-slate-500">واتساب الدعم</div>
        <a
          href={CONTACT_WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="text-lg font-bold text-accent-400 hover:underline"
          dir="ltr"
        >
          {CONTACT_WHATSAPP}
        </a>
      </div>
    </article>
  );
}
