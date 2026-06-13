"use client";

import { useEffect, useState } from "react";
import { useUI } from "./I18nProvider";
import { BellIcon } from "./icons";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const DISMISS_KEY = "wc26_push_prompt_dismissed";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// App-wide attention-grabbing prompt to enable push notifications. Shows once per
// session (until enabled) for users who CAN enable push but haven't. iOS-without-
// install and unsupported browsers are skipped (the InstallPrompt covers iOS).
export function EnablePushModal() {
  const UI = useUI();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!VAPID_PUBLIC) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    const ua = navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    // Can't enable here → leave it to InstallPrompt (iOS) / do nothing.
    if (!supported || (isIOS && !standalone)) return;
    if (Notification.permission === "denied") return;

    // Show only if not already subscribed. Small delay so it doesn't fight first paint.
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => (reg ? reg.pushManager.getSubscription() : null))
      .then((sub) => {
        if (!sub) setTimeout(() => setShow(true), 800);
      })
      .catch(() => setTimeout(() => setShow(true), 800));
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function enable() {
    setBusy(true);
    setError(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied") dismiss();
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("subscribe failed");
      sessionStorage.setItem(DISMISS_KEY, "1");
      setShow(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={dismiss}>
      <div
        className="w-full max-w-sm rounded-2xl border border-accent-500/40 bg-navy-950 p-6 text-center shadow-[0_0_50px_rgba(43,123,255,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-accent-500/20 text-4xl text-accent-300 ring-1 ring-accent-400/40">
          <BellIcon className="loader-bob" />
        </div>
        <h2 className="mb-2 font-display text-xl font-extrabold text-white">{UI.pushModalTitle}</h2>
        <p className="mb-5 text-sm text-slate-300">{error ? UI.remindersError : UI.pushModalDesc}</p>
        <button onClick={enable} disabled={busy} className="btn-primary w-full">
          {busy ? UI.enabling : UI.enableReminders}
        </button>
        <button onClick={dismiss} disabled={busy} className="mt-2 w-full py-2 text-sm text-slate-400 hover:text-slate-200">
          {UI.later}
        </button>
      </div>
    </div>
  );
}
