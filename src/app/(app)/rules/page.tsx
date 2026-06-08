import { UI } from "@/lib/constants";

export default function RulesPage() {
  return (
    <div className="prose-invert mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-extrabold">{UI.rules}</h1>

      <section className="card mb-4 p-5">
        <h2 className="mb-2 font-bold text-gold-400">كيف تشارك؟</h2>
        <ul className="list-disc space-y-1 pr-5 text-sm text-slate-300">
          <li>توقّع نتيجة كل مباراة قبل انطلاقها.</li>
          <li>يُغلق التوقع تلقائيًا عند بداية المباراة ولا يمكن تعديله بعد ذلك.</li>
          <li>يمكنك تعديل توقعك أي عدد من المرات قبل صافرة البداية.</li>
        </ul>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-2 font-bold text-gold-400">نظام النقاط — دور المجموعات</h2>
        <ul className="list-disc space-y-1 pr-5 text-sm text-slate-300">
          <li>النتيجة الدقيقة صحيحة: <b>3 نقاط</b></li>
          <li>توقّع الفائز/التعادل فقط: <b>نقطة واحدة</b></li>
          <li>توقّع خاطئ: <b>0</b></li>
        </ul>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-2 font-bold text-gold-400">نظام النقاط — الأدوار الإقصائية</h2>
        <ul className="list-disc space-y-1 pr-5 text-sm text-slate-300">
          <li>النتيجة الدقيقة (قبل ركلات الترجيح): <b>3 نقاط</b></li>
          <li>توقّع النتيجة الصحيحة (قبل الترجيح): <b>نقطة واحدة</b></li>
          <li>توقّع الفريق المتأهل صحيح: <b>+1 نقطة</b></li>
          <li>الحد الأقصى للمباراة الإقصائية: <b>4 نقاط</b></li>
        </ul>
        <p className="mt-3 rounded-lg bg-navy-800 p-3 text-xs text-slate-400">
          ملاحظة: تُحتسب نتيجة المباراة على أساس النتيجة قبل ركلات الترجيح، بينما يُحتسب
          الفريق المتأهل بشكل منفصل. لذلك قد تكون النتيجة تعادلًا مع وجود فريق متأهل.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 font-bold text-gold-400">قواعد كسر التعادل في الترتيب</h2>
        <ol className="list-decimal space-y-1 pr-5 text-sm text-slate-300">
          <li>مجموع النقاط الأعلى.</li>
          <li>عدد النتائج الدقيقة الأكثر.</li>
          <li>عدد النتائج الصحيحة الأكثر.</li>
          <li>الأسبق في إرسال التوقعات.</li>
        </ol>
      </section>
    </div>
  );
}
