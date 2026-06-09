"use client";

import { useEffect, useState } from "react";
import { useUI } from "./I18nProvider";

// Minimal type for the Chrome-only beforeinstallprompt event.
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

const IOS_SEEN_KEY = "wc26_ios_install_seen";

export function InstallPrompt() {
  const UI = useUI();
  const [mounted, setMounted] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Android: reveal the manual how-to only after a short grace period, so we
  // don't flash it when Chrome's native prompt is about to arrive.
  const [androidGrace, setAndroidGrace] = useState(false);

  useEffect(() => {
    setMounted(true);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || window.__wc26Installed) {
      setInstalled(true);
      return;
    }
    const ua = navigator.userAgent || "";
    const ios = /iphone|ipad|ipod/i.test(ua);
    const android = /android/i.test(ua);
    setIsIOS(ios);
    setIsAndroid(android);

    // The layout's inline script may have already captured the event before
    // React hydrated — pick it up. Otherwise listen for the re-dispatched event.
    if (window.__wc26InstallPrompt) setDeferred(window.__wc26InstallPrompt);
    const onReady = () => setDeferred(window.__wc26InstallPrompt ?? null);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("wc26:install-ready", onReady);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));

    const timers: ReturnType<typeof setTimeout>[] = [];
    // iOS can't trigger install programmatically — auto-open the how-to once.
    if (ios && !localStorage.getItem(IOS_SEEN_KEY)) {
      localStorage.setItem(IOS_SEEN_KEY, "1");
      timers.push(setTimeout(() => setSheetOpen(true), 1200));
    }
    // Android fallback: if no native prompt has arrived, offer manual steps.
    if (android) timers.push(setTimeout(() => setAndroidGrace(true), 1500));

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("wc26:install-ready", onReady);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  async function nativeInstall() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    window.__wc26InstallPrompt = null;
    setDeferred(null);
  }

  if (!mounted || installed) return null;
  // Show when we can actually help: native install, iOS guide, or — once the
  // grace window passes with no native prompt — the Android manual guide.
  if (!deferred && !isIOS && !(isAndroid && androidGrace)) return null;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-accent-500/30 bg-accent-500/[0.06] px-4 py-3">
        <HomeIcon className="text-lg text-accent-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-100">{UI.installTitle}</div>
          <div className="text-xs text-slate-400">{UI.installDesc}</div>
        </div>
        {deferred ? (
          <button onClick={nativeInstall} className="btn-primary px-4 py-1.5 text-sm">
            {UI.installAdd}
          </button>
        ) : (
          <button onClick={() => setSheetOpen(true)} className="btn-primary px-4 py-1.5 text-sm">
            {UI.installHow}
          </button>
        )}
      </div>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl border-t border-white/10 bg-navy-950 p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <h3 className="mb-4 text-center font-display text-lg font-bold text-white">
              {isIOS ? UI.installIosSheetTitle : UI.installAndroidSheetTitle}
            </h3>
            {isIOS ? (
              <ol className="space-y-3">
                <Step n={1} text={UI.installIosStep1} icon={<ShareIosIcon className="text-xl text-accent-400" />} />
                <Step n={2} text={UI.installIosStep2} icon={<AddSquareIcon className="text-xl text-accent-400" />} />
                <Step n={3} text={UI.installIosStep3} />
              </ol>
            ) : (
              <ol className="space-y-3">
                <Step n={1} text={UI.installAndroidStep1} icon={<MenuDotsIcon className="text-xl text-accent-400" />} />
                <Step n={2} text={UI.installAndroidStep2} icon={<AddSquareIcon className="text-xl text-accent-400" />} />
                <Step n={3} text={UI.installAndroidStep3} />
              </ol>
            )}
            <p className="mt-4 rounded-lg bg-white/[0.04] px-3 py-2 text-center text-xs text-slate-400">
              {isIOS ? UI.installIosNote : UI.installAndroidNote}
            </p>
            <button onClick={() => setSheetOpen(false)} className="btn-primary mt-4 w-full">
              {UI.installClose}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n, text, icon }: { n: number; text: string; icon?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500/20 font-display text-sm font-bold text-accent-300">
        {n}
      </span>
      <span className="flex-1 text-sm text-slate-200">{text}</span>
      {icon}
    </li>
  );
}

// iOS Share glyph (rounded square with an up arrow leaving the top).
function ShareIosIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 3v12" />
      <path d="M8.5 6.5 12 3l3.5 3.5" />
      <path d="M7 11H5.5A1.5 1.5 0 0 0 4 12.5v6A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18.5 11H17" />
    </svg>
  );
}

// "Add to Home Screen" glyph (rounded square with a plus).
function AddSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

// Android overflow-menu glyph (three vertical dots).
function MenuDotsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
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
