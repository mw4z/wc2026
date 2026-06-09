import { getUI } from "@/lib/locale";
import { BrandMark } from "@/components/Logo";

export const dynamic = "force-dynamic";

// Shared shell for the login choice + sign-in + sign-up pages.
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const UI = await getUI();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <BrandMark className="mx-auto mb-4 h-16 w-16 drop-shadow-[0_8px_30px_rgba(43,123,255,0.45)]" />
        <span className="font-display text-[11px] font-bold uppercase tracking-widest2 text-accent-400">
          {UI.worldCup26}
        </span>
        <h1 className="hero-title mt-1 text-3xl font-extrabold leading-tight">{UI.appName}</h1>
        <p className="mt-2 text-sm text-slate-400">{UI.loginSubtitle}</p>
      </div>
      {children}
    </main>
  );
}
