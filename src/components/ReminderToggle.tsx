"use client";

import { useEffect, useState } from "react";
import { useUI } from "./I18nProvider";
import { BellIcon } from "./icons";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

// Push applicationServerKey must be a Uint8Array of the URL-safe base64 VAPID key.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "ios-install" | "blocked" | "off" | "on";

export function ReminderToggle() {
  const UI = useUI();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!VAPID_PUBLIC) {
      setState("unsupported");
      return;
    }
    const ua = navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

    if (!supported) {
      // iOS Safari only exposes Push inside an installed PWA — nudge to install.
      setState(isIOS && !standalone ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("blocked");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setBusy(true);
    setError(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
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
      setState("on");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(false);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  // "ios-install" is handled by the dedicated InstallPrompt guide, so don't show
  // a redundant reminders card here — it reappears (functional) once installed.
  if (state === "loading" || state === "unsupported" || state === "ios-install") return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <BellIcon className="text-lg text-accent-400" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-100">{UI.remindersTitle}</div>
        <div className="text-xs text-slate-400">
          {state === "ios-install"
            ? UI.remindersIosHint
            : state === "blocked"
              ? UI.remindersBlocked
              : error
                ? UI.remindersError
                : UI.remindersDesc}
        </div>
      </div>
      {state === "off" && (
        <button onClick={enable} disabled={busy} className="btn-primary px-4 py-1.5 text-sm">
          {busy ? UI.enabling : UI.enableReminders}
        </button>
      )}
      {state === "on" && (
        <div className="flex items-center gap-2">
          <span className="pill pill-done">{UI.remindersOn}</span>
          <button onClick={disable} disabled={busy} className="btn-ghost px-3 py-1.5 text-sm">
            {UI.disableReminders}
          </button>
        </div>
      )}
    </div>
  );
}
