import { redirect } from "next/navigation";
import { getPendingSignup } from "@/lib/auth";
import { getUI } from "@/lib/locale";
import { SignupForm } from "@/components/SignupForm";

export const dynamic = "force-dynamic";

// Step 2. The phone is taken ONLY from the pending-signup cookie; if it's
// missing/expired the user must restart at /login (can't reach signup directly).
export default async function SignUpPage() {
  const phoneE164 = await getPendingSignup();
  if (!phoneE164) redirect("/login");
  const UI = await getUI();

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-white">{UI.createAccount}</h2>
        <p className="mt-1 text-sm text-slate-400">{UI.signupSubtitle}</p>
      </div>
      <SignupForm phone={phoneE164} />
    </div>
  );
}
