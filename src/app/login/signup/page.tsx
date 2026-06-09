import { redirect } from "next/navigation";
import { getPendingSignup, getInvitePending } from "@/lib/auth";
import { getUI } from "@/lib/locale";
import { SignupForm } from "@/components/SignupForm";

export const dynamic = "force-dynamic";

// Step 2. The email is taken ONLY from the pending-signup cookie; if it's
// missing/expired the user must restart at /login (can't reach signup directly).
export default async function SignUpPage() {
  const email = await getPendingSignup();
  if (!email) redirect("/login");
  // If the user arrived via an invite link, pre-fill the group code (join mode).
  const inviteCode = await getInvitePending();
  const UI = await getUI();

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-white">{UI.createAccount}</h2>
        <p className="mt-1 text-sm text-slate-400">{UI.signupSubtitle}</p>
      </div>
      <SignupForm email={email} inviteCode={inviteCode} />
    </div>
  );
}
