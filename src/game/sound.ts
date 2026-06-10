// Tiny Web-Audio sound layer. Effects are synthesized on the fly (no asset
// files to ship or load), so they work offline in the PWA. Browsers only allow
// audio after a user gesture, so call unlockAudio() from a tap/click handler
// before any sound is expected.
//
// iOS notes: Safari (a) only lets you resume an AudioContext synchronously
// inside a real user gesture — a requestAnimationFrame callback does NOT count —
// and (b) silences pure Web-Audio output while the hardware ring/silent switch
// is on, unless the page has also started an <audio> element. unlockAudio()
// therefore both resumes the context AND kicks a short silent <audio> loop,
// which flips iOS into the "playback" session so the klaxon plays even on
// silent. It must run from inside a gesture at least once.

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

// A short silent WAV, generated once. Playing this through an HTMLAudioElement
// during a gesture is the established trick to let Web Audio bypass the iOS
// mute switch (it changes the page's audio session category).
let silentEl: HTMLAudioElement | null = null;

function makeSilentWavUrl(): string {
  const sampleRate = 8000;
  const samples = 800; // 0.1s of 8-bit mono silence
  const buf = new Uint8Array(44 + samples);
  const view = new DataView(buf.buffer);
  const writeStr = (off: number, s: string): void => {
    for (let i = 0; i < s.length; i++) buf[off + i] = s.charCodeAt(i);
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format = PCM
  view.setUint16(22, 1, true); // channels
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // byte rate (8-bit mono)
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, samples, true);
  buf.fill(128, 44); // 8-bit unsigned silence
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return "data:audio/wav;base64," + btoa(bin);
}

function unlockSilentEl(): void {
  if (typeof Audio === "undefined") return;
  if (!silentEl) {
    try {
      silentEl = new Audio(makeSilentWavUrl());
      silentEl.loop = true;
      silentEl.volume = 0;
      (silentEl as HTMLAudioElement & { playsInline?: boolean }).playsInline =
        true;
    } catch {
      silentEl = null;
      return;
    }
  }
  silentEl.play().catch(() => {});
}

// Create/resume the AudioContext and flip the iOS audio session. Safe to call
// repeatedly; must run inside a user gesture at least once (e.g. the first tap)
// to satisfy mobile autoplay and the iOS mute switch.
export function unlockAudio(): void {
  const c = getCtx();
  if (c) {
    if (c.state === "suspended") c.resume().catch(() => {});
    // Prime the graph with a zero-gain tick so the first real beep isn't
    // swallowed by iOS's first-sound latency.
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.01);
    } catch {
      // ignore
    }
  }
  unlockSilentEl();
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
  if (!c) return;
  // If iOS left the context suspended, try once more — the breach itself isn't
  // a gesture, but a craft tap earlier in the round usually unlocked it.
  if (c.state !== "running") {
    c.resume().catch(() => {});
    return;
  }
  const t = c.currentTime;
  beep(c, t, 440, 0.18, "square", 0.16);
  beep(c, t + 0.16, 330, 0.26, "square", 0.18);
}

// Harsh, dissonant "disaster" sting for shooting down a civilian plane — a
// downward klaxon plus a clashing low cluster so it reads as a mistake, clearly
// distinct from the breach klaxon above.
export function playDisasterAlarm(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state !== "running") {
    c.resume().catch(() => {});
    return;
  }
  const t = c.currentTime;
  // A dissonant low dyad (minor 2nd-ish clash) held under a falling wail.
  beep(c, t, 220, 0.55, "sawtooth", 0.16);
  beep(c, t, 233, 0.55, "sawtooth", 0.14); // clashes with 220 → unsettling
  // Falling siren on top: drag the frequency down for a "going down" feel.
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(520, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.6);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.64);
}
