// Tiny Web-Audio sound layer. Effects are synthesized on the fly (no asset
// files to ship or load), so they work offline in the PWA. Browsers only allow
// audio after a user gesture, so call unlockAudio() from a tap/click handler
// before any sound is expected.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  return ctx;
}

// Create/resume the AudioContext. Safe to call repeatedly; must run inside a
// user gesture at least once (e.g. the first tap) to satisfy mobile autoplay.
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

function beep(
  c: AudioContext,
  start: number,
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

// Klaxon-style two-tone warning for a border breach / damage taken.
export function playBreachAlarm(): void {
  const c = getCtx();
  if (!c || c.state !== "running") return;
  const t = c.currentTime;
  beep(c, t, 440, 0.18, "square", 0.16);
  beep(c, t + 0.16, 330, 0.26, "square", 0.18);
}
