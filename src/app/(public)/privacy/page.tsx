import type { Metadata } from "next";
import { CONTACT_WHATSAPP, CONTACT_WHATSAPP_LINK } from "@/lib/ads";

export const metadata: Metadata = {
  title: "سياسة الخصوصية — توقعات كأس 2026",
  description: "كيف نجمع البيانات ونستخدمها ونحميها في لعبة التوقعات.",
};

export default function PrivacyPage() {
  return (
    <article className="space-y-4 text-slate-300">
      <h1 className="text-2xl font-extrabold text-white">سياسة الخصوصية</h1>

      <h2 className="font-bold text-gold-400">البيانات التي نجمعها</h2>
      <p>يجمع الموقع الاسم الظاهر ورقم الجوال فقط. لا نطلب كلمة مرور.</p>

      <h2 className="font-bold text-gold-400">كيف نستخدم رقم الجوال</h2>
      <p>
        يُستخدم رقم الجوال لتسجيل الدخول وتحديد هوية الحساب فقط. <strong>لا يظهر رقم الجوال علنًا</strong> لأي
        مشارك آخر، ولا في لوحة المتصدرين، ولا في صفحات المجموعات. تعرض لوحة المتصدرين الاسم الظاهر والنقاط فقط،
        ولا تعرض المجموعات أرقام الجوال.
      </p>

      <h2 className="font-bold text-gold-400">ملفات تعريف الارتباط (Cookies)</h2>
      <p>
        يستخدم الموقع ملفات تعريف الارتباط أو تقنيات مشابهة لإدارة الجلسات والحفاظ على أمان الحساب.
      </p>

      <h2 className="font-bold text-gold-400">الإعلانات</h2>
      <p>
        في حال تفعيل الإعلانات، قد يستخدم شركاء الإعلان الخارجيون — بما في ذلك Google — ملفات تعريف الارتباط
        أو إشارات الويب (web beacons) أو عناوين IP أو تقنيات مشابهة لعرض الإعلانات وقياس أدائها.
      </p>

      <h2 className="font-bold text-gold-400">حذف البيانات والتواصل</h2>
      <p>
        يمكنك التواصل معنا لطلب حذف بياناتك أو لأي استفسار يتعلّق بالخصوصية عبر واتساب:{" "}
        <a
          href={CONTACT_WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-400 hover:underline"
          dir="ltr"
        >
          {CONTACT_WHATSAPP}
        </a>
        .
      </p>
    </article>
  );
}
