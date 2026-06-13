"use client";

import { useEffect, useState } from "react";
import { useUI } from "./I18nProvider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
declare global {
  interface Window {
    __wc26InstallPrompt?: BeforeInstallPromptEvent | null;
    __wc26Installed?: boolean;
  }
}

const DISMISS_KEY = "wc26_install_prompt_dismissed";
const ELIGIBLE_FLAG = "wc26_install_eligible"; // tells the push modal to defer this session
const IOS_SEEN_KEY = "wc26_ios_install_seen"; // also suppresses the /matches auto-sheet

type Mode = "native" | "ios" | "android" | null;

// App-wide prominent "install the app" modal. Once per session, for users who
// aren't installed yet. iOS gets the Share→Add guide; Android/desktop get the
// one-tap native install (or a manual guide if the native prompt isn't offered).
export function InstallAppModal() {
  const UI = useUI();
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || window.__wc26Installed) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    const ua = navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);

    const decide = (): Mode => {
      if (isIOS) return "ios";
      if (window.__wc26InstallPrompt) return "native";
      if (isAndroid) return "android";
      return null;
    };

    const eligible = decide();
    if (!eligible) {
      // A native prompt may still arrive shortly (Chrome) — catch it then.
      const onReady = () => { flagAndShow("native"); };
      window.addEventListener("wc26:install-ready", onReady, { once: true });
      window.addEventListener("beforeinstallprompt", onReady, { once: true });
      return () => {
        window.removeEventListener("wc26:install-ready", onReady);
        window.removeEventListener("beforeinstallprompt", onReady);
      };
    }
    flagAndShow(eligible);

    function flagAndShow(m: Mode) {
      sessionStorage.setItem(ELIGIBLE_FLAG, "1"); // push modal defers to this
      if (isIOS) localStorage.setItem(IOS_SEEN_KEY, "1");
      setTimeout(() => setMode(m), 600);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setMode(null);
  }

  async function nativeInstall() {
    const dp = window.__wc26InstallPrompt;
    if (!dp) return;
    await dp.prompt();
    await dp.userChoice;
    window.__wc26InstallPrompt = null;
    dismiss();
  }

  if (!mode) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={dismiss}>
      <div
        className="w-full max-w-sm rounded-2xl border border-accent-500/40 bg-navy-950 p-6 text-center shadow-[0_0_50px_rgba(43,123,255,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-accent-500/20 text-accent-300 ring-1 ring-accent-400/40">
          <HomeIcon className="text-3xl" />
        </div>
        <h2 className="mb-1 font-display text-xl font-extrabold text-white">{UI.installTitle}</h2>
        <p className="mb-5 text-sm text-slate-300">{UI.installDesc}</p>

        {mode === "native" ? (
          <button onClick={nativeInstall} className="btn-primary w-full">{UI.installAdd}</button>
        ) : (
          <ol className="mb-1 space-y-3 text-start">
            {mode === "ios" ? (
              <>
                <Step n={1} text={UI.installIosStep1} icon={<ShareIosIcon />} />
                <Step n={2} text={UI.installIosStep2} icon={<AddSquareIcon />} />
                <Step n={3} text={UI.installIosStep3} />
              </>
            ) : (
              <>
                <Step n={1} text={UI.installAndroidStep1} />
                <Step n={2} text={UI.installAndroidStep2} icon={<AddSquareIcon />} />
                <Step n={3} text={UI.installAndroidStep3} />
              </>
            )}
          </ol>
        )}

        <button onClick={dismiss} className="mt-3 w-full py-2 text-sm text-slate-400 hover:text-slate-200">
          {mode === "native" ? UI.later : UI.installClose}
        </button>
      </div>
    </div>
  );
}

function Step({ n, text, icon }: { n: number; text: string; icon?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500/20 font-display text-sm font-bold text-accent-300">{n}</span>
      <span className="flex-1 text-sm text-slate-200">{text}</span>
      {icon && <span className="text-xl text-accent-400">{icon}</span>}
    </li>
  );
}

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5h12V10" />
    </svg>
  );
}
function ShareIosIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 3v12" /><path d="M8.5 6.5 12 3l3.5 3.5" />
      <path d="M7 11H5.5A1.5 1.5 0 0 0 4 12.5v6A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18.5 11H17" />
    </svg>
  );
}
function AddSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}
