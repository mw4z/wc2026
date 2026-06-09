import { getUI } from "@/lib/locale";
import { BrandMark } from "@/components/Logo";
import { LangToggle } from "@/components/LangToggle";

export const dynamic = "force-dynamic";

// Shared shell for the login choice + sign-in + sign-up pages.
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const UI = await getUI();
  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="absolute end-4 top-[calc(env(safe-area-inset-top)+1rem)] z-10">
        <LangToggle />
      </div>
      <div className="mb-8 text-center">
        <BrandMark className="mx-auto mb-4 h-16 w-16 drop-shadow-[0_8px_30px_rgba(43,123,255,0.45)]" />
        <span className="font-display text-[11px] font-bold uppercase tracking-widest2 text-accent-400">
          {UI.worldCup26}
        </span>
        <h1 className="hero-title mt-1 text-3xl font-extrabold leading-tight">{UI.appName}</h1>
      </div>
      {children}
    </main>
  );
}
