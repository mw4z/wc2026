// In-app sound effects for live events (goal, kickoff whistle, full-time). Synthesized
// with the Web Audio API — no audio files, works offline. NOTE: these play only while
// the app is OPEN and after a user gesture (browser autoplay policy); web push
// notifications can't carry custom sounds, so this is the in-app counterpart.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Resume the audio context inside a user gesture (call once on first interaction). */
export function unlockAudio(): void {
  audio();
}

export function soundEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem("wc26_sound") !== "off";
}

export function setSoundEnabled(on: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("wc26_sound", on ? "on" : "off");
}

// A single shaped tone (attack + exponential decay).
function tone(a: AudioContext, freq: number, at: number, dur: number, type: OscillatorType, vol: number): void {
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

/** Goal — a short triumphant ascending fanfare. */
export function playGoal(): void {
  if (!soundEnabled()) return;
  const a = audio();
  if (!a) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => tone(a, f, i * 0.09, 0.28, "triangle", 0.22));
  tone(a, 1568, notes.length * 0.09, 0.35, "triangle", 0.16); // G6 flourish
}

/** Your prediction was right — a bright, rewarding chime. */
export function playWin(): void {
  if (!soundEnabled()) return;
  const a = audio();
  if (!a) return;
  const notes = [659.25, 830.61, 987.77, 1318.5]; // E5 G#5 B5 E6 (major, uplifting)
  notes.forEach((f, i) => tone(a, f, i * 0.08, 0.3, "triangle", 0.2));
}

/** Your prediction missed — a soft descending "aww" (not harsh). */
export function playLose(): void {
  if (!soundEnabled()) return;
  const a = audio();
  if (!a) return;
  tone(a, 392, 0, 0.28, "sine", 0.18); // G4
  tone(a, 311.13, 0.18, 0.45, "sine", 0.18); // Eb4 (down a minor third)
}

/** Kickoff / full-time — a referee whistle (two trilled high bursts). */
export function playWhistle(bursts = 2): void {
  if (!soundEnabled()) return;
  const a = audio();
  if (!a) return;
  for (let i = 0; i < bursts; i++) {
    const start = a.currentTime + i * 0.28;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(2300, start);
    // Trill (LFO on frequency) gives the rolling whistle texture.
    const lfo = a.createOscillator();
    const lg = a.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 16;
    lg.gain.value = 130;
    lfo.connect(lg).connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(0.16, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    osc.connect(g).connect(a.destination);
    osc.start(start);
    lfo.start(start);
    osc.stop(start + 0.24);
    lfo.stop(start + 0.24);
  }
}
