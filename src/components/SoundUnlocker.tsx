"use client";

import { useEffect } from "react";
import { unlockAudio } from "@/lib/sounds";

// Unlocks the Web Audio context on the first user gesture so live sound effects
// (goal/whistle) can play later. Required by browser autoplay policies.
export function SoundUnlocker() {
  useEffect(() => {
    const onGesture = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, []);
  return null;
}
