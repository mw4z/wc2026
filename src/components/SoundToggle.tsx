"use client";

import { useEffect, useState } from "react";
import { useUI } from "./I18nProvider";
import { soundEnabled, setSoundEnabled, playGoal, unlockAudio } from "@/lib/sounds";

// Profile control: enable/disable in-app live sound effects (goal fanfare + kickoff
// whistle). Plays a sample when turned on so the user hears what it does.
export function SoundToggle() {
  const UI = useUI();
  const [on, setOn] = useState(true);
  useEffect(() => setOn(soundEnabled()), []);

  function toggle() {
    const next = !on;
    setOn(next);
    setSoundEnabled(next);
    if (next) {
      unlockAudio();
      playGoal(); // sample
    }
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <SpeakerIcon className="text-lg text-accent-400" muted={!on} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-100">{UI.soundTitle}</div>
        <div className="text-xs text-slate-400">{UI.soundDesc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-lime-500" : "bg-white/15"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "start-[22px]" : "start-0.5"}`} />
      </button>
    </div>
  );
}

function SpeakerIcon({ muted, ...props }: { muted?: boolean } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 9v6h3l5 4V5L7 9H4z" />
      {muted ? <path d="M16 9l5 5M21 9l-5 5" /> : <path d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7 7 0 0 1 0 12" />}
    </svg>
  );
}
