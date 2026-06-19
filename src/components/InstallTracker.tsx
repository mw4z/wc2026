"use client";

import { useEffect } from "react";

// Records that the user has the app INSTALLED, the first time it's opened in
// standalone (home-screen) mode. Server uses this to stop the "add to home screen"
// push reminders. Fire-and-forget; once per browser session via sessionStorage.
export function InstallTracker() {
  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    if (sessionStorage.getItem("wc26_installed_reported")) return;
    sessionStorage.setItem("wc26_installed_reported", "1");
    fetch("/api/profile/installed", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
