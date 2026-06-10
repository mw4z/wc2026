import type { Metadata } from "next";
import { CONTACT_WHATSAPP, CONTACT_WHATSAPP_LINK, SOCIAL_X_URL, SOCIAL_X_HANDLE } from "@/lib/ads";
import { XIcon } from "@/components/icons";

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

      <p>تابعنا على منصّة X لآخر التحديثات والأخبار:</p>
      <a
        href={SOCIAL_X_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="card flex items-center justify-center gap-2.5 p-4 font-bold text-white transition hover:border-white/25"
      >
        <XIcon className="text-lg" />
        <span dir="ltr">{SOCIAL_X_HANDLE}</span>
      </a>
    </article>
  );
}
