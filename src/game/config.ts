import type { CraftSpec } from "./types.ts";

// Easy-level roster. Hostiles head for cities; friendlies/neutrals transit
// and must NOT be intercepted. Speeds are normalized units/sec (arena
// height ≈ 1.0), so 0.04 ≈ crosses the map in ~25s.
export const SPECS: Record<string, CraftSpec> = {
  drone: {
    kind: "drone",
    allegiance: "hostile",
    speed: 0.026,
    color: "var(--red)",
    label: "כטב\"ם עוין",
    intel: "רחפן נפץ",
    points: 800,
    spawnWeight: 3,
  },
  fighter: {
    kind: "fighter",
    allegiance: "hostile",
    speed: 0.04,
    color: "var(--red)",
    label: "מטוס קרב עוין",
    intel: "מטוס קרב עוין",
    points: 800,
    spawnWeight: 2,
  },
  missile: {
    kind: "missile",
    allegiance: "hostile",
    speed: 0.055,
    color: "var(--red)",
    label: "טיל שיוט",
    intel: "טיל שיוט",
    points: 800,
    spawnWeight: 0.8,
  },
  airliner: {
    kind: "airliner",
    allegiance: "neutral",
    speed: 0.028,
    color: "var(--white)",
    label: "מטוס נוסעים",
    intel: "מטוס נוסעים",
    points: -400,
    spawnWeight: 1.0,
  },
  helicopter: {
    kind: "airliner", // civilian plane — drawn white like the airliner
    allegiance: "friendly",
    speed: 0.032,
    color: "var(--white)",
    label: "מטוס אזרחי",
    intel: "מטוס אזרחי",
    points: -400,
    spawnWeight: 0.7,
  },
};

// Scoring per spec §4.7
export const SCORING = {
  speedBonus: 200, // intercept within speedBonusMs of the enemy appearing
  speedBonusMs: 5000,
  breach: -600, // hostile crossed the border without being intercepted
  friendlyHitLives: 1, // life lost for hitting a friendly/neutral
  breachLives: 1, // life lost for a border breach
};

export const SPEC_LIST = Object.values(SPECS);

// Scenario tuning (easy level).
export const SCENARIO = {
  durationMs: 90_000,
  lives: 3,
  firstSpawnDelayMs: 2200, // grace period before the first contact
  interceptRadius: 0.07, // tap within this normalized radius destroys craft
};

// Spawn cadence over the 90s run: a calm 8s gap at the open that tightens to
// 7 → 5 → 4 seconds, then a relentless 1-per-second surge in the final 15s.
// Each row means "while fewer than `untilSec` seconds have elapsed, launch one
// craft every `gapMs`." Times are elapsed seconds.
export const SPAWN_SCHEDULE: ReadonlyArray<{ untilSec: number; gapMs: number }> =
  [
    { untilSec: 18, gapMs: 8000 }, // calm opening
    { untilSec: 30, gapMs: 5000 },
    { untilSec: 45, gapMs: 3000 },
    { untilSec: 60, gapMs: 2000 }, // up to the final surge
  ];
// Final push: with this many seconds (or fewer) left, spawn every second.
// From 60s elapsed onward (last 30s) it's a relentless 1-per-second wall.
export const FINAL_SURGE = { fromSecLeft: 30, gapMs: 1000 };

// Difficulty ramps with scenario progress (0 → 1): more craft can be airborne
// at once and everything flies a bit faster. The cap is generous enough that
// the spawn cadence above is never blocked by craft already on screen.
export const DIFFICULTY = {
  maxConcurrentStart: 4,
  maxConcurrentEnd: 18,
  speedMulStart: 0.8,
  speedMulEnd: 1.4,
  // Cruise-missile share of spawns ramps with progress: nearly absent at the
  // start, a major threat by the end (multiplies the missile spawnWeight).
  missileWeightStart: 0.15,
  missileWeightEnd: 2.2,
};

// Two F-16 patrols inside the border — drag onto an enemy to intercept.
// north covers Galilee/Haifa; south covers the Negev/Eilat approaches.
export const FIGHTERS = [
  { home: { x: 0.2, y: 0.39 }, speed: 0.11 }, // sea west of Tel Aviv — clear of the Haifa battery
  { home: { x: 0.42, y: 0.53 }, speed: 0.11 }, // Beer Sheva / Negev
];

// Two Iron Dome batteries with radar coverage — can only hit enemies inside
// their radar circle. radarRadius is normalized to arena WIDTH. Placed on the
// border well clear of the patrols so they don't fight for the same taps.
export const BATTERIES = [
  { pos: { x: 0.429, y: 0.275 }, radarRadius: 0.33 }, // Haifa / north
  { pos: { x: 0.41, y: 0.8 }, radarRadius: 0.45 }, // Eilat — southern approaches
];

export const DOME = {
  missileSpeed: 0.16, // normalized units/sec
  reloadMs: 1200, // battery locked while firing + this reload
  hitPx: 24,
};

export const INTERCEPT = {
  fighterHitPx: 26, // contact distance for an F-16 kill
  returnSpeedMul: 1.5,
  tapRadiusPx: 38, // how close a tap/drop must be to grab an enemy/unit
  fighterRangePx: 165, // F-16 reach — only enemies inside can be sent
  patrolRadiusPx: 20, // orbit radius while loitering
  patrolSpeed: 0.8, // radians/sec around the patrol anchor
  tapSlopPx: 9, // movement under this = a tap, not a drag
};

// Weighted spec pick. Cruise missiles are rare in the opening and grow into a
// dominant threat as `progress` (0 → 1) climbs, so the late game is missile-heavy.
export function pickSpec(progress = 0): CraftSpec {
  const missileMul =
    DIFFICULTY.missileWeightStart +
    (DIFFICULTY.missileWeightEnd - DIFFICULTY.missileWeightStart) * progress;
  const weightOf = (c: CraftSpec) =>
    c.kind === "missile" ? c.spawnWeight * missileMul : c.spawnWeight;
  const total = SPEC_LIST.reduce((s, c) => s + weightOf(c), 0);
  let r = Math.random() * total;
  for (const spec of SPEC_LIST) {
    r -= weightOf(spec);
    if (r <= 0) return spec;
  }
  return SPEC_LIST[0];
}
